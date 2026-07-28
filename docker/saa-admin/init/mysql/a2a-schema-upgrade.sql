-- A2A schema upgrade for existing volumes (idempotent)
-- Apply manually when upgrading from a DB that already has agentscope-schema.sql without A2A tables.

CREATE TABLE IF NOT EXISTS `a2a_remote_agent`
(
    `id`               BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'pk',
    `gmt_create`       DATETIME            NOT NULL COMMENT 'create time',
    `gmt_modified`     DATETIME            NOT NULL COMMENT 'modified time',
    `agent_code`       VARCHAR(64)         NOT NULL COMMENT 'agent code',
    `name`             VARCHAR(128)        NOT NULL COMMENT 'agent name',
    `description`      VARCHAR(1024)       NULL COMMENT 'description',
    `source_type`      VARCHAR(32)         NOT NULL COMMENT 'source type URL/NACOS',
    `card_url`         VARCHAR(1024)       NULL COMMENT 'agent card url',
    `nacos_agent_name` VARCHAR(128)        NULL COMMENT 'nacos agent name',
    `card_json`        TEXT                NULL COMMENT 'cached agent card json',
    `workspace_id`     VARCHAR(64)         NULL COMMENT 'workspace id',
    `account_id`       VARCHAR(64)         NULL COMMENT 'uid',
    `status`           TINYINT             NOT NULL COMMENT 'status 0 disabled 1 enabled 3 deleted',
    PRIMARY KEY (`id`),
    KEY `idx_agent_code` (`agent_code`),
    KEY `idx_workspace_status` (`workspace_id`, `status`),
    KEY `idx_name` (`name`)
) ENGINE = InnoDB
  AUTO_INCREMENT = 10000
  DEFAULT CHARSET = utf8mb4
    COMMENT ='a2a remote agent info';

CREATE TABLE IF NOT EXISTS `a2a_agent_publication`
(
    `id`               BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'pk',
    `gmt_create`       DATETIME            NOT NULL COMMENT 'create time',
    `gmt_modified`     DATETIME            NOT NULL COMMENT 'modified time',
    `publication_code` VARCHAR(64)         NOT NULL COMMENT 'publication code',
    `app_id`           VARCHAR(64)         NOT NULL COMMENT 'app id',
    `app_type`         VARCHAR(32)         NOT NULL COMMENT 'app type basic/workflow',
    `agent_name`       VARCHAR(128)        NOT NULL COMMENT 'published agent name',
    `description`      VARCHAR(1024)       NULL COMMENT 'description',
    `enabled`          TINYINT             NOT NULL DEFAULT 1 COMMENT 'enabled 0/1',
    `card_json`        TEXT                NULL COMMENT 'agent card json',
    `nacos_registered` TINYINT             NOT NULL DEFAULT 0 COMMENT 'nacos registered 0/1',
    `workspace_id`     VARCHAR(64)         NULL COMMENT 'workspace id',
    `account_id`       VARCHAR(64)         NULL COMMENT 'uid',
    `status`           TINYINT             NOT NULL COMMENT 'status 0 disabled 1 enabled 3 deleted',
    PRIMARY KEY (`id`),
    KEY `idx_app_id` (`app_id`),
    KEY `idx_publication_code` (`publication_code`),
    KEY `idx_workspace_status` (`workspace_id`, `status`)
) ENGINE = InnoDB
  AUTO_INCREMENT = 10000
  DEFAULT CHARSET = utf8mb4
    COMMENT ='a2a agent publication info';
