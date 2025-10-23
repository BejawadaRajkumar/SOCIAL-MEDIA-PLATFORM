package com.chat.microservice.websocket;

import com.chat.microservice.model.Message;
import com.chat.microservice.service.ChatService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ChatService chatService;

    @Autowired
    public ChatWebSocketHandler(ChatService chatService) {
        this.chatService = chatService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String email = (String) session.getAttributes().get("email");
        if (email != null) {
            sessions.put(email, session);
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        try {
            Message chatMessage = objectMapper.readValue(payload, Message.class);
            chatService.saveMessage(chatMessage);

            WebSocketSession recipientSession = sessions.get(chatMessage.getReceiverEmail());
            if (recipientSession != null && recipientSession.isOpen()) {
                recipientSession.sendMessage(new TextMessage(objectMapper.writeValueAsString(chatMessage)));
            }

            if (session.isOpen()) {
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(chatMessage)));
            }
        } catch (Exception e) {
            if (session.isOpen()) {
                session.sendMessage(new TextMessage("Error: Invalid message format"));
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String email = (String) session.getAttributes().get("email");
        if (email != null) {
            sessions.remove(email);
        }
    }
}