package com.musab.lostandfound.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ChatMessageResponseDto {

    private Long id;

    private Long itemId;

    private String senderEmail;

    private String receiverEmail;

    private String content;

    private LocalDateTime timestamp;
}
