package com.musab.lostandfound.service;

import com.musab.lostandfound.dto.ItemRequestDto;
import com.musab.lostandfound.dto.ItemResponseDto;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ItemService {

    ItemResponseDto reportLost(ItemRequestDto dto, MultipartFile image);

    ItemResponseDto reportFound(ItemRequestDto dto, MultipartFile image);

    List<ItemResponseDto> getAllItems();

    ItemResponseDto claimItem(long id);
}
