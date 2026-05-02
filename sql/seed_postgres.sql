-- Seed data for local development (PostgreSQL / Supabase)
-- Run with: npm run seed:postgres

TRUNCATE donors, donations RESTART IDENTITY CASCADE;

INSERT INTO donors (id, first_name, last_name, email, address, phone) VALUES
  -- Regular donors (6+ donations)
  (1,  'Alice',       'Johnson',    'alice.johnson84@gmail.com',     '214 Maple Ave',       '(312) 555-0101'),
  (2,  'Carol',       'White',      'carolwhite77@yahoo.com',        '503 Riverside Blvd',  '(847) 555-0263'),
  (3,  'Sandra',      'Morales',    'sandramorales@icloud.com',      '234 Cloverdale St',   '(847) 555-1021'),
  (4,  'James',       'Okafor',     'james.okafor@gmail.com',        '112 Birchwood Rd',    '(773) 555-0728'),
  (5,  'Bob',         'Smith',      'bsmith.chicago@outlook.com',    '87 Lakeview Dr',      '(773) 555-0142'),
  (6,  'Emily',       'Torres',     'emilytorres@icloud.com',        '761 Sunset Rd',       '(312) 555-0415'),
  -- Occasional donors (3–5 donations)
  (7,  'Linda',       'Park',       'lindapark55@yahoo.com',         '67 Greenfield Ave',   '(312) 555-0819'),
  (8,  'David',       'Kim',        'dkim.family@gmail.com',         '19 Thornwood Ct',     '(630) 555-0384'),
  (9,  'Margaret',    'Chen',       'margaret.chen@outlook.com',     '328 Elmwood Pl',      '(847) 555-0637'),
  (10, 'Kevin',       'Patel',      'kpatel.work@gmail.com',         '890 Willow Creek Dr', '(630) 555-0960'),
  (11, 'Frank',       'Nguyen',     'f.nguyen92@gmail.com',          '45 Oak Park Ln',      '(708) 555-0596'),
  -- Two-time donors
  (12, 'Tom',         'Fitzgerald', 'tfitzgerald@outlook.com',       '55 Briar Hill Ln',    '(708) 555-1132'),
  (13, 'Marcus',      'Williams',   'marcuswill91@gmail.com',        '403 Sycamore Ct',     '(773) 555-1243'),
  (14, 'Ryan',        'O''Brien',   'ryan.obrien@outlook.com',       '78 Hawthorn Blvd',    '(312) 555-1354'),
  (15, 'Natalie',     'Brooks',     'nataliebrooks@icloud.com',      '561 Pinecrest Dr',    '(630) 555-1465'),
  -- One-time donors
  (16, 'Priya',       'Sharma',     'priya.sharma88@gmail.com',      '29 Redwood Terr',     '(847) 555-1576'),
  (17, 'Lisa',        'Chen',       'lisachen.personal@gmail.com',   '104 Walnut Grove Ln', '(312) 555-1687'),
  (18, 'Aisha',       'Jackson',    'aisha.j@yahoo.com',             '715 Lakewood Ave',    '(773) 555-1798'),
  (19, 'Daniel',      'Reyes',      'danielreyes@gmail.com',         '238 Foxglove Rd',     '(708) 555-1809'),
  (20, 'Owen',        'Murray',     'owen.murray@outlook.com',       '92 Elmhurst Pkwy',    '(847) 555-1910'),
  (21, 'Sofia',       'Hernandez',  'sofia.hernandez@gmail.com',     '317 Crestwood Dr',    '(312) 555-2021'),
  (22, 'Ethan',       'Wallace',    'ethanwallace@yahoo.com',        '48 Ridgeline Ave',    '(630) 555-2132'),
  (23, 'Rachel',      'Goldstein',  'rgoldstein@outlook.com',        '822 Fernwood Ct',     '(847) 555-2243'),
  (24, 'Marcus',      'Tran',       'marcus.tran92@gmail.com',       '193 Chestnut Blvd',   '(773) 555-2354'),
  (25, 'Isabelle',    'Dupont',     'idupont.personal@icloud.com',   '60 Willowmere Ln',    '(708) 555-2465'),
  (26, 'Andre',       'Coleman',    'andrecoleman@gmail.com',        '445 Spruce Hill Rd',  '(312) 555-2576'),
  (27, 'Nina',        'Vasquez',    'ninavasquez88@yahoo.com',       '71 Brookside Terr',   '(847) 555-2687'),
  (28, 'Christopher', 'Lee',        'clee.home@gmail.com',           '209 Ashford Way',     '(630) 555-2798'),
  (29, 'Fatima',      'Al-Hassan',  'fatima.alhassan@outlook.com',   '534 Cliffside Pkwy',  '(773) 555-2809'),
  (30, 'Jordan',      'Blake',      'jordanblake@icloud.com',        '87 Meadowlark Dr',    '(708) 555-2910');

-- Reset sequence so new inserts continue from 31
SELECT setval('donors_id_seq', 30);

INSERT INTO donations (donor_id, amount, donation_date, receipt_status) VALUES
  -- Alice Johnson (1), 10 donations
  (1, 250.00, '2024-01-15', 'sent'),
  (1, 100.00, '2024-04-08', 'sent'),
  (1, 500.00, '2024-07-22', 'sent'),
  (1, 150.00, '2024-10-14', 'sent'),
  (1, 250.00, '2025-01-10', 'sent'),
  (1, 175.00, '2025-04-30', 'sent'),
  (1, 300.00, '2025-07-08', 'sent'),
  (1, 350.00, '2025-11-28', 'sent'),
  (1, 100.00, '2026-01-20', 'sent'),
  (1, 150.00, '2026-03-05', 'pending'),

  -- Carol White (2), 9 donations
  (2, 500.00, '2024-03-20', 'sent'),
  (2,  20.00, '2024-07-12', 'sent'),
  (2, 350.00, '2024-12-20', 'sent'),
  (2,  30.00, '2025-03-05', 'sent'),
  (2, 275.00, '2025-06-30', 'sent'),
  (2, 450.00, '2025-08-19', 'sent'),
  (2, 500.00, '2025-11-10', 'sent'),
  (2, 450.00, '2026-01-09', 'sent'),
  (2,  25.00, '2026-03-01', 'pending'),

  -- Sandra Morales (3), 8 donations
  (3, 300.00, '2024-02-07', 'sent'),
  (3, 250.00, '2024-05-21', 'sent'),
  (3,  25.00, '2024-09-15', 'sent'),
  (3, 600.00, '2024-12-28', 'sent'),
  (3, 275.00, '2025-03-18', 'sent'),
  (3, 350.00, '2025-07-04', 'sent'),
  (3, 500.00, '2025-12-31', 'sent'),
  (3, 275.00, '2026-02-18', 'pending'),

  -- James Okafor (4), 7 donations
  (4, 200.00, '2024-01-28', 'sent'),
  (4, 175.00, '2024-05-03', 'sent'),
  (4, 300.00, '2024-08-19', 'sent'),
  (4, 250.00, '2024-12-05', 'sent'),
  (4, 350.00, '2025-04-14', 'sent'),
  (4,  30.00, '2025-10-30', 'sent'),
  (4, 150.00, '2026-03-12', 'pending'),

  -- Bob Smith (5), 6 donations
  (5,  75.00, '2024-02-10', 'sent'),
  (5, 150.00, '2024-06-15', 'sent'),
  (5, 200.00, '2024-09-25', 'sent'),
  (5, 100.00, '2025-02-14', 'sent'),
  (5, 300.00, '2025-10-05', 'sent'),
  (5, 200.00, '2026-02-14', 'sent'),

  -- Emily Torres (6), 6 donations
  (6, 100.00, '2024-05-18', 'sent'),
  (6, 150.00, '2024-11-03', 'sent'),
  (6, 200.00, '2025-04-22', 'sent'),
  (6, 275.00, '2025-06-30', 'sent'),
  (6, 425.00, '2025-10-22', 'sent'),
  (6, 325.00, '2026-02-27', 'pending'),

  -- Linda Park (7), 5 donations
  (7,  75.00, '2024-03-11', 'sent'),
  (7, 100.00, '2024-07-29', 'sent'),
  (7, 125.00, '2025-01-06', 'sent'),
  (7, 100.00, '2025-06-18', 'sent'),
  (7, 125.00, '2025-11-22', 'sent'),

  -- David Kim (8), 5 donations
  (8,  50.00, '2024-06-30', 'sent'),
  (8,  75.00, '2024-11-15', 'sent'),
  (8,  50.00, '2025-02-14', 'sent'),
  (8, 100.00, '2025-09-11', 'sent'),
  (8,  75.00, '2025-12-18', 'sent'),

  -- Margaret Chen (9), 4 donations
  (9, 200.00, '2024-02-20', 'sent'),
  (9, 150.00, '2024-05-10', 'sent'),
  (9, 250.00, '2024-09-08', 'sent'),
  (9, 175.00, '2025-01-15', 'sent'),

  -- Kevin Patel (10), 3 donations
  (10, 150.00, '2025-05-09', 'sent'),
  (10, 250.00, '2025-09-23', 'sent'),
  (10, 200.00, '2026-01-30', 'sent'),

  -- Frank Nguyen (11), 3 donations
  (11,  50.00, '2024-08-08', 'sent'),
  (11,  75.00, '2025-05-17', 'sent'),
  (11, 125.00, '2025-12-05', 'sent'),

  -- Tom Fitzgerald (12), 2 donations
  (12, 100.00, '2024-04-16', 'sent'),
  (12,  75.00, '2025-08-14', 'sent'),

  -- Marcus Williams (13), 2 donations
  (13,  50.00, '2025-03-27', 'sent'),
  (13,  75.00, '2025-07-14', 'sent'),

  -- Ryan O'Brien (14), 2 donations
  (14, 150.00, '2025-08-02', 'sent'),
  (14, 200.00, '2026-01-11', 'sent'),

  -- Natalie Brooks (15), 2 donations
  (15, 125.00, '2025-06-08', 'sent'),
  (15, 150.00, '2025-12-19', 'sent'),

  -- One-time donors
  (16, 250.00, '2025-03-22', 'sent'),
  (17, 100.00, '2024-11-08', 'sent'),
  (18,  75.00, '2025-09-30', 'sent'),
  (19, 200.00, '2024-06-17', 'sent'),
  (20,  50.00, '2025-02-03', 'sent'),
  (21, 150.00, '2024-08-25', 'sent'),
  (22, 100.00, '2025-05-14', 'sent'),
  (23, 500.00, '2024-12-02', 'sent'),
  (24,  75.00, '2025-07-19', 'sent'),
  (25, 300.00, '2026-01-07', 'sent'),
  (26,  25.00, '2025-04-03', 'sent'),
  (27, 125.00, '2024-09-30', 'sent'),
  (28, 250.00, '2025-11-06', 'sent'),
  (29,  50.00, '2025-06-22', 'sent'),
  (30, 175.00, '2026-02-09', 'sent');

-- Reset donations sequence after explicit-ID inserts
SELECT setval('donations_id_seq', (SELECT MAX(id) FROM donations));
