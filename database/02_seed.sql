-- SplitEase: sample data
-- The same rows inserted in Digital Assignment 2, unchanged.

-- Lookup tables. The application needs these two to work.
INSERT INTO categories VALUES (201, 'Accommodation');
INSERT INTO categories VALUES (202, 'Food');
INSERT INTO categories VALUES (203, 'Travel');
INSERT INTO categories VALUES (204, 'Entertainment');
INSERT INTO categories VALUES (205, 'Utilities');

INSERT INTO payment_method VALUES (301, 'Cash');
INSERT INTO payment_method VALUES (302, 'UPI');
INSERT INTO payment_method VALUES (303, 'Bank Transfer');
INSERT INTO payment_method VALUES (304, 'Credit Card');
INSERT INTO payment_method VALUES (305, 'Wallet');

-- Users
INSERT INTO users VALUES (1, 'Linus Rayar Manickam', '9876500001', 'linus@gmail.com');
INSERT INTO users VALUES (2, 'Sakthi Durga',         '9876500002', 'sakthi@gmail.com');
INSERT INTO users VALUES (3, 'Jyotsna Srinivas',     '9876500003', 'jyotsna@gmail.com');
INSERT INTO users VALUES (4, 'Arjun Kumar',          '9876500004', 'arjun@gmail.com');
INSERT INTO users VALUES (5, 'Kavin Raj',            '9876500005', 'kavin@gmail.com');

-- Groups
INSERT INTO groups VALUES (101, 'Goa Trip',           1, DATE '2026-08-10');
INSERT INTO groups VALUES (102, 'Apartment Expenses', 2, DATE '2026-08-12');
INSERT INTO groups VALUES (103, 'College Project',    3, DATE '2026-08-15');
INSERT INTO groups VALUES (104, 'Weekend Party',      4, DATE '2026-08-18');
INSERT INTO groups VALUES (105, 'Ooty Trip',          5, DATE '2026-08-20');

-- User_Groups
INSERT INTO user_groups VALUES (1, 101, DATE '2026-08-10');
INSERT INTO user_groups VALUES (2, 101, DATE '2026-08-10');
INSERT INTO user_groups VALUES (2, 102, DATE '2026-08-12');
INSERT INTO user_groups VALUES (3, 102, DATE '2026-08-12');
INSERT INTO user_groups VALUES (3, 103, DATE '2026-08-15');
INSERT INTO user_groups VALUES (4, 103, DATE '2026-08-15');
INSERT INTO user_groups VALUES (4, 104, DATE '2026-08-18');
INSERT INTO user_groups VALUES (5, 104, DATE '2026-08-18');
INSERT INTO user_groups VALUES (5, 105, DATE '2026-08-20');
INSERT INTO user_groups VALUES (1, 105, DATE '2026-08-20');

-- Expenses
INSERT INTO expenses VALUES (401, 101, 1, 'Hotel booking',            201, DATE '2026-08-15', 12000);
INSERT INTO expenses VALUES (402, 102, 2, 'Monthly electricity bill', 205, DATE '2026-08-20', 3500);
INSERT INTO expenses VALUES (403, 103, 3, 'Project materials',        204, DATE '2026-08-22', 2000);
INSERT INTO expenses VALUES (404, 104, 4, 'Restaurant dinner',        202, DATE '2026-08-25', 5000);
INSERT INTO expenses VALUES (405, 105, 5, 'Cab charges',              203, DATE '2026-08-28', 4000);

-- Splits
INSERT INTO splits VALUES (501, 401, 2, 50, 6000, 'PENDING');
INSERT INTO splits VALUES (502, 402, 3, 50, 1750, 'PENDING');
INSERT INTO splits VALUES (503, 403, 4, 50, 1000, 'PAID');
INSERT INTO splits VALUES (504, 404, 5, 50, 2500, 'PARTIALLY PAID');
INSERT INTO splits VALUES (505, 405, 1, 50, 2000, 'PENDING');

-- Settlements
INSERT INTO settlements VALUES (601, 101, 2, 1, 3000, DATE '2026-08-17', 302);
INSERT INTO settlements VALUES (602, 102, 3, 2, 1750, DATE '2026-08-22', 303);
INSERT INTO settlements VALUES (603, 103, 4, 3, 1000, DATE '2026-08-24', 301);
INSERT INTO settlements VALUES (604, 104, 5, 4, 1500, DATE '2026-08-27', 305);
INSERT INTO settlements VALUES (605, 105, 1, 5, 2000, DATE '2026-08-30', 304);

-- Attachment
INSERT INTO attachment VALUES (701, 401, 'https://splitease.com/files/hotel_bill.pdf',       1, DATE '2026-08-15');
INSERT INTO attachment VALUES (702, 402, 'https://splitease.com/files/electricity_bill.pdf', 2, DATE '2026-08-20');
INSERT INTO attachment VALUES (703, 403, 'https://splitease.com/files/materials_bill.pdf',   3, DATE '2026-08-22');
INSERT INTO attachment VALUES (704, 404, 'https://splitease.com/files/dinner_bill.pdf',      4, DATE '2026-08-25');
INSERT INTO attachment VALUES (705, 405, 'https://splitease.com/files/cab_bill.pdf',         5, DATE '2026-08-28');

-- Recurring_Expenses
INSERT INTO recurring_expenses VALUES (801, 101, 1, 'Weekly food expense',           2000, 'WEEKLY',  DATE '2026-09-20', 'EQUAL');
INSERT INTO recurring_expenses VALUES (802, 102, 2, 'Monthly electricity bill',      3500, 'MONTHLY', DATE '2026-10-01', 'EQUAL');
INSERT INTO recurring_expenses VALUES (803, 103, 3, 'Project software subscription', 1200, 'MONTHLY', DATE '2026-10-05', 'EXACT');
INSERT INTO recurring_expenses VALUES (804, 104, 4, 'Weekend entertainment',         1000, 'WEEKLY',  DATE '2026-09-19', 'PERCENTAGE');
INSERT INTO recurring_expenses VALUES (805, 105, 5, 'Annual travel membership',      5000, 'YEARLY',  DATE '2027-01-01', 'EQUAL');

-- Move each id generator past the rows above so new rows continue the numbering.
SELECT setval('users_user_id_seq',             (SELECT MAX(user_id)       FROM users));
SELECT setval('groups_group_id_seq',           (SELECT MAX(group_id)      FROM groups));
SELECT setval('expenses_expense_id_seq',       (SELECT MAX(expense_id)    FROM expenses));
SELECT setval('splits_split_id_seq',           (SELECT MAX(split_id)      FROM splits));
SELECT setval('settlements_settlement_id_seq', (SELECT MAX(settlement_id) FROM settlements));
SELECT setval('attachment_attachment_id_seq',  (SELECT MAX(attachment_id) FROM attachment));
SELECT setval('recurring_expenses_rec_id_seq', (SELECT MAX(rec_id)        FROM recurring_expenses));
