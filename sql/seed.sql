-- Seed data for local development
-- Run with: npm run seed

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE donations;
TRUNCATE TABLE donors;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO donors (name, email, address, phone, total_donations, donation_count, most_recent) VALUES
  ('Alice Johnson',   'alice@example.com',   '123 Main St',    '555-0101', 1450.00, 8,  '2026-03-01'),
  ('Bob Smith',       'bob@example.com',     '456 Oak Ave',    '555-0102',  850.00, 5,  '2026-02-14'),
  ('Carol White',     'carol@example.com',   '789 Pine Rd',    '555-0103', 2100.00, 10, '2026-01-20'),
  ('David Kim',       'david@example.com',   '321 Elm St',     '555-0104',  600.00, 4,  '2025-12-10'),
  ('Emily Torres',    'emily@example.com',   '654 Cedar Blvd', '555-0105',  950.00, 6,  '2025-11-05'),
  ('Frank Nguyen',    'frank@example.com',   '987 Birch Ln',   '555-0106',  400.00, 3,  '2025-10-22');

INSERT INTO donations (donor_name, donor_email, amount, donation_date, receipt_status) VALUES
  -- 2024 data (last year, for YoY comparison)
  ('Alice Johnson',  'alice@example.com',  200.00, '2024-01-15', 'sent'),
  ('Bob Smith',      'bob@example.com',    150.00, '2024-02-10', 'sent'),
  ('Carol White',    'carol@example.com',  300.00, '2024-03-20', 'sent'),
  ('Alice Johnson',  'alice@example.com',  100.00, '2024-04-05', 'sent'),
  ('Emily Torres',   'emily@example.com',  250.00, '2024-05-18', 'sent'),
  ('David Kim',      'david@example.com',  175.00, '2024-06-30', 'sent'),
  ('Carol White',    'carol@example.com',  400.00, '2024-07-12', 'sent'),
  ('Frank Nguyen',   'frank@example.com',  125.00, '2024-08-08', 'sent'),
  ('Bob Smith',      'bob@example.com',    200.00, '2024-09-25', 'sent'),
  ('Alice Johnson',  'alice@example.com',  150.00, '2024-10-14', 'sent'),
  ('Emily Torres',   'emily@example.com',  300.00, '2024-11-03', 'sent'),
  ('Carol White',    'carol@example.com',  350.00, '2024-12-20', 'sent'),

  -- 2025 data (last year cont. + feeds into last 6 months)
  ('Alice Johnson',  'alice@example.com',  250.00, '2025-01-10', 'sent'),
  ('David Kim',      'david@example.com',  175.00, '2025-02-14', 'sent'),
  ('Carol White',    'carol@example.com',  400.00, '2025-03-05', 'sent'),
  ('Bob Smith',      'bob@example.com',    200.00, '2025-04-22', 'sent'),
  ('Frank Nguyen',   'frank@example.com',  150.00, '2025-05-17', 'sent'),
  ('Emily Torres',   'emily@example.com',  275.00, '2025-06-30', 'sent'),
  ('Alice Johnson',  'alice@example.com',  300.00, '2025-07-08', 'sent'),
  ('Carol White',    'carol@example.com',  450.00, '2025-08-19', 'sent'),
  ('David Kim',      'david@example.com',  225.00, '2025-09-11', 'sent'),
  -- Last 6 months (Oct 2025 - Mar 2026)
  ('Bob Smith',      'bob@example.com',    300.00, '2025-10-05', 'sent'),
  ('Emily Torres',   'emily@example.com',  425.00, '2025-10-22', 'sent'),
  ('Carol White',    'carol@example.com',  500.00, '2025-11-10', 'sent'),
  ('Alice Johnson',  'alice@example.com',  350.00, '2025-11-28', 'sent'),
  ('Frank Nguyen',   'frank@example.com',  275.00, '2025-12-05', 'sent'),
  ('David Kim',      'david@example.com',  200.00, '2025-12-18', 'sent'),
  ('Carol White',    'carol@example.com',  450.00, '2026-01-09', 'sent'),
  ('Alice Johnson',  'alice@example.com',  100.00, '2026-01-20', 'sent'),
  ('Bob Smith',      'bob@example.com',    200.00, '2026-02-14', 'sent'),
  ('Emily Torres',   'emily@example.com',  325.00, '2026-02-27', 'pending'),
  ('Carol White',    'carol@example.com',  400.00, '2026-03-01', 'pending'),
  ('Alice Johnson',  'alice@example.com',  150.00, '2026-03-05', 'pending');
