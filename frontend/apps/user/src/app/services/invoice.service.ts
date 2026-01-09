import { apiClient } from "./api-client.service.js";
import {
  InvoiceResponseSchema,
  type InvoiceResponse,
  type PagedResponse,
} from "@edumind/shared-types";
import { INVOICE_ENDPOINTS } from "@edumind/shared-utils";

export interface InvoicePaginationParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

const parseInvoiceResponse = (payload: unknown): InvoiceResponse =>
  InvoiceResponseSchema.parse(payload);

export const invoiceService = {
  /**
   * Get current user's invoices (paginated)
   */
  async getMyInvoices(
    params: InvoicePaginationParams = {}
  ): Promise<PagedResponse<InvoiceResponse>> {
    const response = await apiClient.get<PagedResponse<InvoiceResponse>>(
      INVOICE_ENDPOINTS.BASE,
      { params }
    );
    return response.data!;
  },

  /**
   * Get invoice detail by ID
   */
  async getInvoiceById(invoiceId: number): Promise<InvoiceResponse> {
    const response = await apiClient.get<InvoiceResponse>(
      INVOICE_ENDPOINTS.DETAIL(invoiceId)
    );
    return parseInvoiceResponse(response.data);
  },

  /**
   * Get invoice by invoice number
   */
  async getInvoiceByNumber(invoiceNumber: string): Promise<InvoiceResponse> {
    const response = await apiClient.get<InvoiceResponse>(
      INVOICE_ENDPOINTS.BY_NUMBER(invoiceNumber)
    );
    return parseInvoiceResponse(response.data);
  },

  /**
   * Get invoice by order ID
   */
  async getInvoiceByOrderId(orderId: number): Promise<InvoiceResponse> {
    const response = await apiClient.get<InvoiceResponse>(
      INVOICE_ENDPOINTS.BY_ORDER(orderId)
    );
    return parseInvoiceResponse(response.data);
  },

  /**
   * Get invoice PDF download URL
   */
  getDownloadUrl(invoiceId: number): string {
    return INVOICE_ENDPOINTS.DOWNLOAD(invoiceId);
  },

  /**
   * Get invoice PDF view URL (inline)
   */
  getViewUrl(invoiceId: number): string {
    return INVOICE_ENDPOINTS.VIEW(invoiceId);
  },

  /**
   * Download invoice as blob
   */
  async downloadInvoicePdf(invoiceId: number): Promise<Blob> {
    const response = await apiClient.get(INVOICE_ENDPOINTS.DOWNLOAD(invoiceId), {
      responseType: "blob",
    });
    return response.data as Blob;
  },
};

export type InvoiceService = typeof invoiceService;
