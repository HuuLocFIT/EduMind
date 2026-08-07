package com.edumind.common.util;

import com.edumind.common.exception.FileUploadException;
import org.w3c.dom.Attr;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public final class SvgSanitizer {

    static final String SVG_NS = "http://www.w3.org/2000/svg";
    private static final String XLINK_NS = "http://www.w3.org/1999/xlink";

    // Fail-safe allowlist: only these structural/static SVG tags survive sanitization.
    // Anything else — script, foreignObject, animate*, set, or any future/unknown element —
    // is dropped by default rather than requiring a growing denylist.
    private static final Set<String> ALLOWED_ELEMENTS = new HashSet<>(Arrays.asList(
            "svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon",
            "defs", "use", "symbol", "lineargradient", "radialgradient", "stop", "clippath",
            "mask", "pattern", "title", "desc", "style"
    ));

    private SvgSanitizer() {
    }

    public static byte[] sanitize(byte[] svgBytes) {
        Document document = parseSvgDocument(svgBytes);

        Element root = document.getDocumentElement();
        if (root == null || !SVG_NS.equals(root.getNamespaceURI()) || !"svg".equals(root.getLocalName())) {
            throw new FileUploadException("Invalid or unsafe SVG file");
        }

        sanitizeElement(root);

        return serialize(document);
    }

    /**
     * Parses SVG/XML bytes with XXE-hardened, namespace-aware settings. Package-visible so
     * FileTypeSniffer can reuse the same hardened parsing path instead of duplicating it.
     */
    static Document parseSvgDocument(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            throw new FileUploadException("Invalid or unsafe SVG file");
        }

        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(true);
            // Disallowing DOCTYPE outright is the simplest complete defense against XXE/entity
            // expansion attacks in SVG (which is plain XML under the hood).
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
            factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            factory.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
            factory.setXIncludeAware(false);
            factory.setExpandEntityReferences(false);
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");

            DocumentBuilder builder = factory.newDocumentBuilder();
            return builder.parse(new ByteArrayInputStream(bytes));
        } catch (ParserConfigurationException | SAXException | IOException e) {
            throw new FileUploadException("Invalid or unsafe SVG file");
        }
    }

    private static void sanitizeElement(Element element) {
        NodeList children = element.getChildNodes();
        for (int i = children.getLength() - 1; i >= 0; i--) {
            Node child = children.item(i);
            if (child.getNodeType() == Node.ELEMENT_NODE) {
                Element childElement = (Element) child;
                if (!isAllowedElement(childElement)) {
                    element.removeChild(child);
                    continue;
                }
                stripAttributes(childElement);
                sanitizeElement(childElement);
            }
        }
        stripAttributes(element);
    }

    private static boolean isAllowedElement(Element element) {
        String localName = element.getLocalName();
        if (localName == null) {
            return false;
        }
        return SVG_NS.equals(element.getNamespaceURI()) && ALLOWED_ELEMENTS.contains(localName.toLowerCase());
    }

    private static void stripAttributes(Element element) {
        if (!element.hasAttributes()) {
            return;
        }

        java.util.List<String> toRemove = new java.util.ArrayList<>();
        org.w3c.dom.NamedNodeMap attributes = element.getAttributes();
        for (int i = 0; i < attributes.getLength(); i++) {
            Attr attr = (Attr) attributes.item(i);
            String localName = attr.getLocalName() != null ? attr.getLocalName() : attr.getName();
            String lowerLocalName = localName.toLowerCase();

            if (attr.getNamespaceURI() == null && lowerLocalName.startsWith("on")) {
                toRemove.add(attr.getName());
                continue;
            }

            boolean isUnprefixedHref = attr.getNamespaceURI() == null && "href".equals(attr.getLocalName());
            boolean isXlinkHref = XLINK_NS.equals(attr.getNamespaceURI()) && "href".equals(attr.getLocalName());

            if (isUnprefixedHref || isXlinkHref) {
                String value = attr.getValue() == null ? "" : attr.getValue().trim();
                // Only local fragment references (#id) are safe; anything else can smuggle
                // javascript:, data:, or external SSRF/exfiltration URLs.
                if (!value.startsWith("#")) {
                    toRemove.add(attr.getName());
                }
            }
        }

        for (String name : toRemove) {
            element.removeAttribute(name);
        }
    }

    private static byte[] serialize(Document document) {
        try {
            TransformerFactory transformerFactory = TransformerFactory.newInstance();
            transformerFactory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            transformerFactory.setAttribute(XMLConstants.ACCESS_EXTERNAL_STYLESHEET, "");
            Transformer transformer = transformerFactory.newTransformer();
            transformer.setOutputProperty(OutputKeys.ENCODING, "UTF-8");
            transformer.setOutputProperty(OutputKeys.OMIT_XML_DECLARATION, "no");

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            transformer.transform(new DOMSource(document), new StreamResult(outputStream));
            return outputStream.toByteArray();
        } catch (TransformerException e) {
            throw new FileUploadException("Invalid or unsafe SVG file");
        }
    }
}
