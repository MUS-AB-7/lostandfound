package com.musab.lostandfound.controller;

import com.musab.lostandfound.dto.ItemRequestDto;
import com.musab.lostandfound.dto.ItemResponseDto;
import com.musab.lostandfound.entity.Item;
import com.musab.lostandfound.repository.ItemRepository;
import com.musab.lostandfound.service.ItemService;
import com.musab.lostandfound.service.MatchingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/items")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class ItemController {

    private final ItemService itemService;

    private final ItemRepository itemRepository;
    private final MatchingService matchingService;

    @PostMapping("/lost")
    public ItemResponseDto reportLost(@RequestPart ItemRequestDto dto, @RequestPart MultipartFile image){
        return itemService.reportLost(dto, image);
    }

    @PostMapping("/found")
    public ItemResponseDto reportFound(@RequestPart ItemRequestDto dto, @RequestPart MultipartFile image){
        return itemService.reportFound(dto, image);
    }

    @GetMapping
    public List<ItemResponseDto> getAllItems(){
        return itemService.getAllItems();
    }

    @PostMapping("/{id}/claim")
    public ItemResponseDto claimItems(@PathVariable long id){
        return itemService.claimItem(id);
    }

    @GetMapping("/{id}/matches")
    public List<Item> findMatches(@PathVariable Long id){

        Item item = itemRepository.findById(id).orElseThrow();

        return matchingService.findMatches(item);
    }
}
