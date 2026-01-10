import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-keys";
import { invoiceService, type InvoicePaginationParams } from "../services/invoice.service";
import type { InvoiceResponse, PagedResponse } from "@edumind/shared-types";

/**
 * Fetch user's invoices (paginated)
 */
export const useInvoices = (params: InvoicePaginationParams = {}) => {
  return useQuery<PagedResponse<InvoiceResponse>>({
    queryKey: queryKeys.invoices.list(params),
    queryFn: () => invoiceService.getMyInvoices(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Fetch invoice by ID
 */
export const useInvoice = (invoiceId: number, enabled = true) => {
  return useQuery<InvoiceResponse>({
    queryKey: queryKeys.invoices.detail(invoiceId),
    queryFn: () => invoiceService.getInvoiceById(invoiceId),
    enabled: enabled && invoiceId > 0,
    staleTime: 1000 * 60 * 10, // 10 minutes - invoices don't change
  });
};

/**
 * Fetch invoice by invoice number
 */
export const useInvoiceByNumber = (invoiceNumber: string, enabled = true) => {
  return useQuery<InvoiceResponse>({
    queryKey: queryKeys.invoices.byNumber(invoiceNumber),
    queryFn: () => invoiceService.getInvoiceByNumber(invoiceNumber),
    enabled: enabled && !!invoiceNumber,
    staleTime: 1000 * 60 * 10,
  });
};

/**
 * Fetch invoice by order ID
 */
export const useInvoiceByOrder = (orderId: number, enabled = true) => {
  return useQuery<InvoiceResponse>({
    queryKey: queryKeys.invoices.byOrder(orderId),
    queryFn: () => invoiceService.getInvoiceByOrderId(orderId),
    enabled: enabled && orderId > 0,
    staleTime: 1000 * 60 * 10,
  });
};
