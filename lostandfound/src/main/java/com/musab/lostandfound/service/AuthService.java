package com.musab.lostandfound.service;

import com.musab.lostandfound.dto.AuthResponse;
import com.musab.lostandfound.dto.LoginRequest;
import com.musab.lostandfound.dto.RegisterRequest;

public interface AuthService {

    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);
}
