CREATE TABLE users
    (
        id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY ,
        name                 VARCHAR(100) NOT NULL                      ,
        email                VARCHAR(255) NOT NULL UNIQUE               ,
        password_hash        VARCHAR(255) NOT NULL                      ,
        email_verified_at    DATETIME NULL                              ,
        whatsapp_number      VARCHAR(20) NULL                           ,
        whatsapp_verified_at DATETIME NULL                              ,
        whatsapp_opt_in_at   DATETIME NULL                              ,
        created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON
        UPDATE
            CURRENT_TIMESTAMP );
CREATE TABLE email_verification_tokens
    (
        id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY ,
        user_id    BIGINT UNSIGNED NOT NULL                   ,
        token_hash CHAR(64) NOT NULL UNIQUE                   ,
        expires_at DATETIME NOT NULL                          ,
        used_at    DATETIME NULL                              ,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON
        DELETE
            CASCADE );
CREATE TABLE logbooks
    (
        id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY ,
        user_id         BIGINT UNSIGNED NOT NULL                   ,
        entry_date      DATE NOT NULL                              ,
        activity        TEXT NOT NULL                              ,
        learning        TEXT NOT NULL                              ,
        obstacles       TEXT NOT NULL                              ,
        ai_generated_at DATETIME NULL                              ,
        created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON
        UPDATE
            CURRENT_TIMESTAMP
            ,
            UNIQUE KEY logbooks_user_date (user_id, entry_date)
            ,
            KEY logbooks_user_date_idx (user_id, entry_date)
            ,
            FOREIGN KEY (user_id) REFERENCES users(id) ON
        DELETE
            CASCADE );
CREATE TABLE notification_deliveries
    (
        id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY                                ,
        user_id    BIGINT UNSIGNED NOT NULL                                                  ,
        entry_date DATE NOT NULL                                                             ,
        slot ENUM('15:00','19:00') NOT NULL                                                  ,
        channel ENUM('email','whatsapp') NOT NULL                                            ,
        status ENUM('pending','sending','sent','failed','skipped') NOT NULL DEFAULT 'pending',
        attempt_count       TINYINT UNSIGNED NOT NULL DEFAULT 0                              ,
        provider_message_id VARCHAR(255) NULL                                                ,
        last_error_code     VARCHAR(100) NULL                                                ,
        sent_at             DATETIME NULL                                                    ,
        created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP                      ,
        updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON
        UPDATE
            CURRENT_TIMESTAMP
            ,
            UNIQUE KEY deliveries_unique (user_id, entry_date, slot, channel)
            ,
            FOREIGN KEY (user_id) REFERENCES users(id) ON
        DELETE
            CASCADE );