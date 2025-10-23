package com.chat.microservice.controller;

import com.chat.microservice.model.Message;
import com.chat.microservice.service.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    @Autowired
    private ChatService chatService;

    @PostMapping("/sync-user")
    public String syncUser(@RequestBody Map<String, Object> userData) {
        return chatService.syncUser(userData);
    }

    @GetMapping("/messages/{userEmail}/{otherEmail}")
    public List<Message> getMessages(@PathVariable String userEmail, @PathVariable String otherEmail) {
        return chatService.getMessages(userEmail, otherEmail);
    }
}