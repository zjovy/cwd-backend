-- Seed data for local development
-- Run with: npm run seed

INSERT INTO donors (name, email, address, phone, total_donations, donation_count, most_recent) VALUES
  ('Alice Johnson', 'alice@example.com', '123 Main St', '555-0101', 250.00, 2, '2024-11-01'),
  ('Bob Smith', 'bob@example.com', '456 Oak Ave', '555-0102', 100.00, 1, '2024-12-15'),
  ('Carol White', 'carol@example.com', '789 Pine Rd', '555-0103', 500.00, 3, '2025-01-10');

INSERT INTO donations (donor_name, donor_email, amount, donation_date, receipt_status) VALUES
  ('Alice Johnson', 'alice@example.com', 150.00, '2024-11-01', 'sent'),
  ('Alice Johnson', 'alice@example.com', 100.00, '2024-10-15', 'sent'),
  ('Bob Smith', 'bob@example.com', 100.00, '2024-12-15', 'pending'),
  ('Carol White', 'carol@example.com', 200.00, '2025-01-10', 'sent'),
  ('Carol White', 'carol@example.com', 150.00, '2024-09-05', 'sent'),
  ('Carol White', 'carol@example.com', 150.00, '2024-06-20', 'sent');
