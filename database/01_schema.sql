-- SplitEase: relational schema (after normalisation, BCNF)
-- PostgreSQL port of the Oracle DDL in Digital Assignment 2.
--
-- Tables, columns, keys and constraint names are the same as the document.
-- Only the Oracle types are translated:
--   NUMBER        -> INTEGER          (identifiers)
--   NUMBER(p,s)   -> NUMERIC(p,s)
--   VARCHAR2(n)   -> VARCHAR(n)
--   DATE DEFAULT SYSDATE -> DATE DEFAULT CURRENT_DATE

DROP TABLE IF EXISTS recurring_expenses, attachment, settlements, splits,
                     expenses, payment_method, categories, user_groups,
                     groups, users CASCADE;

DROP SEQUENCE IF EXISTS users_user_id_seq, groups_group_id_seq,
                        expenses_expense_id_seq, splits_split_id_seq,
                        settlements_settlement_id_seq,
                        attachment_attachment_id_seq,
                        recurring_expenses_rec_id_seq;

-- 1. USERS
CREATE TABLE users (
    user_id      INTEGER,
    user_name    VARCHAR(100) NOT NULL,
    phone_number VARCHAR(15)  NOT NULL,
    email        VARCHAR(100) NOT NULL,
    CONSTRAINT pk_users       PRIMARY KEY (user_id),
    CONSTRAINT uq_users_phone UNIQUE (phone_number),
    CONSTRAINT uq_users_email UNIQUE (email)
);

-- 2. GROUPS
CREATE TABLE groups (
    group_id   INTEGER,
    group_name VARCHAR(100) NOT NULL,
    created_by INTEGER      NOT NULL,
    created_at DATE DEFAULT CURRENT_DATE NOT NULL,
    CONSTRAINT pk_groups         PRIMARY KEY (group_id),
    CONSTRAINT fk_groups_creator FOREIGN KEY (created_by) REFERENCES users (user_id)
);

-- 3. USER_GROUPS
CREATE TABLE user_groups (
    user_id   INTEGER,
    group_id  INTEGER,
    joined_at DATE DEFAULT CURRENT_DATE NOT NULL,
    CONSTRAINT pk_user_groups PRIMARY KEY (user_id, group_id),
    CONSTRAINT uq_group_user  UNIQUE (group_id, user_id),
    CONSTRAINT fk_ug_user     FOREIGN KEY (user_id)  REFERENCES users (user_id),
    CONSTRAINT fk_ug_group    FOREIGN KEY (group_id) REFERENCES groups (group_id)
);

-- 7. CATEGORIES
CREATE TABLE categories (
    category_id   INTEGER,
    category_name VARCHAR(50) NOT NULL,
    CONSTRAINT pk_categories    PRIMARY KEY (category_id),
    CONSTRAINT uq_category_name UNIQUE (category_name)
);

-- 10. PAYMENT_METHOD
CREATE TABLE payment_method (
    payment_id   INTEGER,
    payment_type VARCHAR(50) NOT NULL,
    CONSTRAINT pk_payment_method PRIMARY KEY (payment_id)
);

-- 4. EXPENSES
CREATE TABLE expenses (
    expense_id  INTEGER,
    group_id    INTEGER       NOT NULL,
    paid_by     INTEGER       NOT NULL,
    description VARCHAR(200)  NOT NULL,
    category_id INTEGER       NOT NULL,
    created_at  DATE DEFAULT CURRENT_DATE NOT NULL,
    amount      NUMERIC(12,2) NOT NULL,
    CONSTRAINT pk_expenses     PRIMARY KEY (expense_id),
    CONSTRAINT fk_exp_group    FOREIGN KEY (group_id)    REFERENCES groups (group_id),
    CONSTRAINT fk_exp_payer    FOREIGN KEY (paid_by)     REFERENCES users (user_id),
    CONSTRAINT fk_exp_category FOREIGN KEY (category_id) REFERENCES categories (category_id),
    CONSTRAINT fk_exp_member   FOREIGN KEY (group_id, paid_by)
                               REFERENCES user_groups (group_id, user_id),
    CONSTRAINT ck_exp_amount   CHECK (amount > 0)
);

-- 5. SPLITS
CREATE TABLE splits (
    split_id      INTEGER,
    expense_id    INTEGER       NOT NULL,
    user_id       INTEGER       NOT NULL,
    split_percent NUMERIC(5,2),
    share_amount  NUMERIC(12,2) NOT NULL,
    status        VARCHAR(20) DEFAULT 'PENDING' NOT NULL,
    CONSTRAINT pk_splits        PRIMARY KEY (split_id),
    CONSTRAINT fk_split_expense FOREIGN KEY (expense_id) REFERENCES expenses (expense_id),
    CONSTRAINT fk_split_user    FOREIGN KEY (user_id)    REFERENCES users (user_id),
    CONSTRAINT uq_expense_user  UNIQUE (expense_id, user_id),
    CONSTRAINT ck_split_percent CHECK (split_percent BETWEEN 0 AND 100 OR split_percent IS NULL),
    CONSTRAINT ck_share_amount  CHECK (share_amount >= 0),
    CONSTRAINT ck_split_status  CHECK (status IN ('PENDING', 'PARTIALLY PAID', 'PAID'))
);

-- 6. SETTLEMENTS
CREATE TABLE settlements (
    settlement_id   INTEGER,
    group_id        INTEGER       NOT NULL,
    paid_by         INTEGER       NOT NULL,
    paid_to         INTEGER       NOT NULL,
    amount          NUMERIC(12,2) NOT NULL,
    settlement_date DATE DEFAULT CURRENT_DATE NOT NULL,
    payment_id      INTEGER       NOT NULL,
    CONSTRAINT pk_settlements         PRIMARY KEY (settlement_id),
    CONSTRAINT fk_settle_group        FOREIGN KEY (group_id)   REFERENCES groups (group_id),
    CONSTRAINT fk_settle_payer        FOREIGN KEY (paid_by)    REFERENCES users (user_id),
    CONSTRAINT fk_settle_receiver     FOREIGN KEY (paid_to)    REFERENCES users (user_id),
    CONSTRAINT fk_settle_method       FOREIGN KEY (payment_id) REFERENCES payment_method (payment_id),
    CONSTRAINT fk_settle_payer_member FOREIGN KEY (group_id, paid_by)
                                      REFERENCES user_groups (group_id, user_id),
    CONSTRAINT fk_settle_to_member    FOREIGN KEY (group_id, paid_to)
                                      REFERENCES user_groups (group_id, user_id),
    CONSTRAINT ck_settle_amount       CHECK (amount > 0),
    CONSTRAINT ck_settle_users        CHECK (paid_by <> paid_to)
);

-- 8. ATTACHMENT
CREATE TABLE attachment (
    attachment_id INTEGER,
    expense_id    INTEGER      NOT NULL,
    file_url      VARCHAR(500) NOT NULL,
    uploaded_by   INTEGER      NOT NULL,
    uploaded_at   DATE DEFAULT CURRENT_DATE NOT NULL,
    CONSTRAINT pk_attachment     PRIMARY KEY (attachment_id),
    CONSTRAINT fk_attach_expense FOREIGN KEY (expense_id)  REFERENCES expenses (expense_id),
    CONSTRAINT fk_attach_user    FOREIGN KEY (uploaded_by) REFERENCES users (user_id)
);

-- 9. RECURRING_EXPENSES
CREATE TABLE recurring_expenses (
    rec_id        INTEGER,
    group_id      INTEGER       NOT NULL,
    paid_by       INTEGER       NOT NULL,
    description   VARCHAR(200)  NOT NULL,
    amount        NUMERIC(12,2) NOT NULL,
    frequency     VARCHAR(20)   NOT NULL,
    next_due_date DATE          NOT NULL,
    split_type    VARCHAR(20)   NOT NULL,
    CONSTRAINT pk_recurring_exp  PRIMARY KEY (rec_id),
    CONSTRAINT fk_rec_group      FOREIGN KEY (group_id) REFERENCES groups (group_id),
    CONSTRAINT fk_rec_payer      FOREIGN KEY (paid_by)  REFERENCES users (user_id),
    CONSTRAINT fk_rec_member     FOREIGN KEY (group_id, paid_by)
                                 REFERENCES user_groups (group_id, user_id),
    CONSTRAINT ck_rec_amount     CHECK (amount > 0),
    CONSTRAINT ck_rec_frequency  CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY')),
    CONSTRAINT ck_rec_split_type CHECK (split_type IN ('EQUAL', 'EXACT', 'PERCENTAGE'))
);

-- Identifier generators.
-- The document's tables take their ids as plain numbers, so the tables above
-- are left exactly as designed and the application asks these sequences for
-- the next id when it inserts a row (the PostgreSQL equivalent of Oracle's
-- seq.NEXTVAL). Each one starts at the range the sample data uses.
CREATE SEQUENCE users_user_id_seq             START 1;
CREATE SEQUENCE groups_group_id_seq           START 101;
CREATE SEQUENCE expenses_expense_id_seq       START 401;
CREATE SEQUENCE splits_split_id_seq           START 501;
CREATE SEQUENCE settlements_settlement_id_seq START 601;
CREATE SEQUENCE attachment_attachment_id_seq  START 701;
CREATE SEQUENCE recurring_expenses_rec_id_seq START 801;
