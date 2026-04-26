package com.musab.lostandfound.controller;

import com.musab.lostandfound.entity.Item;
import com.musab.lostandfound.entity.User;
import com.musab.lostandfound.repository.ItemRepository;
import com.musab.lostandfound.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminController {

    private final ItemRepository itemRepository;

    private final UserRepository userRepository;

    @GetMapping
    public List<User> getUser(){
        return userRepository.findAll();
    }

    @GetMapping("/items")
    public List<Item> getItems(){
        return itemRepository.findAll();
    }

    @DeleteMapping("/item/{id}")
    public void deleteItem(@PathVariable Long id){
        itemRepository.deleteById(id);
    }

    @PostMapping("/users/{id}/make-admin")
    public void makeAdmin(@PathVariable Long id){

        User user = userRepository.findById(id).orElseThrow();

        user.setRole("ROLE_ADMIN");

        userRepository.save(user);
    }
}
