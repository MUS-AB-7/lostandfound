package com.musab.lostandfound.service;

import com.musab.lostandfound.dto.ChatMessageDto;
import com.musab.lostandfound.entity.Message;

import java.util.List;

public interface ChatService {

    Message saveMessage(ChatMessageDto dto);

    List<Message> getMessages(Long itemId);
}
