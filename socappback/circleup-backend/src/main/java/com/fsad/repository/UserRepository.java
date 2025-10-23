package com.fsad.repository;

import com.fsad.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;


@Repository
public interface UserRepository extends JpaRepository<User, String> {
	@Query("select count(U) from Users U where U.email=:email")
    public int validateEmail(@Param("email") String email);
}
