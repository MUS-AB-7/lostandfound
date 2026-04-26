package com.musab.lostandfound.controller;

import com.musab.lostandfound.dto.AuthResponse;
import com.musab.lostandfound.dto.LoginRequest;
import com.musab.lostandfound.dto.RegisterRequest;
import com.musab.lostandfound.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@CrossOrigin("*")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public AuthResponse register(@RequestBody RegisterRequest request){
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody LoginRequest request){
        return authService.login(request);
    }
}
