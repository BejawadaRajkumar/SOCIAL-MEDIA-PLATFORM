package com.fsad.controller;

import com.fsad.model.User;
import com.fsad.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users")
public class UserController {

	@Autowired
	 UserService UM;
		@PostMapping("/signup")
	 public String signup(@RequestBody User U) 
	 {
	  return UM.addUSer(U);  
	 }
}
