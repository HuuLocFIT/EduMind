package com.edumind.common.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PagedResponse<T> {
    private int status;

    @Builder.Default
    private boolean success = true;

    private String message;

    private List<T> data;

    private PageMetadata pagination;

    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();

    private String requestId;

    private String path;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PageMetadata {
        private int page;
        private int size;
        private long totalElements;
        private int totalPages;
        private boolean first;
        private boolean last;
        private boolean hasNext;
        private boolean hasPrevious;
    }

    public static <T> PagedResponse<T> of(List<T> data, int page, int size,
                                          long totalElements, int totalPages) {
        PageMetadata metadata = PageMetadata.builder()
                .page(page)
                .size(size)
                .totalElements(totalElements)
                .totalPages(totalPages)
                .first(page == 0)
                .last(page == totalPages - 1)
                .hasNext(page < totalPages - 1)
                .hasPrevious(page > 0)
                .build();

        return PagedResponse.<T>builder()
                .status(200)
                .success(true)
                .message("Success")
                .data(data)
                .pagination(metadata)
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static <T> PagedResponse<T> ofList(List<T> data) {
        return PagedResponse.<T>builder()
                .status(200)
                .success(true)
                .message("Success")
                .data(data)
                .timestamp(LocalDateTime.now())
                .build();
    }
}