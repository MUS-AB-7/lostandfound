package com.musab.lostandfound.dto;

import lombok.Data;

@Data
public class ChatMessageDto {

    private Long itemId;

    private String senderEmail;

    private String receiverEmail;

    private String context;

}
