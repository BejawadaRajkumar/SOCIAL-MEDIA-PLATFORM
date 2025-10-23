package com.chat.microservice.repository;

import com.chat.microservice.model.Message;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface MessageRepository extends MongoRepository<Message, String> {
    List<Message> findBySenderEmailAndReceiverEmailOrReceiverEmailAndSenderEmail(
        String senderEmail, String receiverEmail, String receiverEmail2, String senderEmail2);
}