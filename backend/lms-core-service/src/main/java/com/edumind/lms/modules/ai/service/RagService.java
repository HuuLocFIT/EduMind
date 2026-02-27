package com.edumind.lms.modules.ai.service;

import com.edumind.lms.modules.ai.dto.request.ChatRequest;
import com.edumind.lms.modules.ai.dto.response.ChatResponse;
import org.springframework.http.codec.ServerSentEvent;
import reactor.core.publisher.Flux;

public interface RagService {

    ChatResponse chat(Long courseId, ChatRequest request, Long userId);

    Flux<ServerSentEvent<String>> chatStream(Long courseId, ChatRequest request, Long userId);
}

