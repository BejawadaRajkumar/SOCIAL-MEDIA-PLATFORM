package com.chat.microservice.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String jwtSecret;

    public String validateToken(String token) {
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(jwtSecret.getBytes()) // Ensure the key is in bytes for HMAC
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
            return claims.getSubject(); // Returns email
        } catch (Exception e) {
            return null;
        }
    }
}