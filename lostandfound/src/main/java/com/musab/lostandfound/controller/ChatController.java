package com.musab.lostandfound.controller;

import com.musab.lostandfound.dto.ChatMessageDto;
import com.musab.lostandfound.dto.ChatMessageResponseDto;
import com.musab.lostandfound.entity.Message;
import com.musab.lostandfound.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/sendMessage")
    public void sendMessage(ChatMessageDto dto){

        Message saved = chatService.saveMessage(dto);

        messagingTemplate.convertAndSend(
                "/topic/chat/" + dto.getItemId(),
                map(saved)
        );
    }

    @GetMapping("/messages/{itemId}")
    public List<ChatMessageResponseDto> getMessages(@PathVariable Long itemId){
        return chatService.getMessages(itemId)
                .stream()
                .map(this::map)
                .toList();
    }

    private ChatMessageResponseDto map(Message message) {
        return ChatMessageResponseDto.builder()
                .id(message.getId())
                .itemId(message.getItem().getId())
                .senderEmail(message.getSender().getEmail())
                .receiverEmail(message.getReceiver().getEmail())
                .content(message.getContent())
                .timestamp(message.getTimestamp())
                .build();
    }

}
