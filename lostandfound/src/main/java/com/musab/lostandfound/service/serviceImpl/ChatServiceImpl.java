package com.musab.lostandfound.service.serviceImpl;

import com.musab.lostandfound.dto.ChatMessageDto;
import com.musab.lostandfound.entity.Item;
import com.musab.lostandfound.entity.Message;
import com.musab.lostandfound.entity.User;
import com.musab.lostandfound.repository.ItemRepository;
import com.musab.lostandfound.repository.MessageRepository;
import com.musab.lostandfound.repository.UserRepository;
import com.musab.lostandfound.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    private final UserRepository userRepository;
    private final ItemRepository itemRepository;
    private final MessageRepository messageRepository;

    @Override
    public Message saveMessage(ChatMessageDto dto) {
        User sender = userRepository.findByEmail(dto.getSenderEmail()).orElseThrow();

        User receiver = userRepository.findByEmail(dto.getReceiverEmail()).orElseThrow();

        Item item = itemRepository.findById(dto.getItemId()).orElseThrow();

        Message message = Message.builder()
                .sender(sender)
                .receiver(receiver)
                .item(item)
                .content(dto.getContext())
                .timestamp(LocalDateTime.now())
                .build();

        return messageRepository.save(message);
    }

    @Override
    public List<Message> getMessages(Long itemId) {
        return messageRepository.findByItemId(itemId);
    }
}
