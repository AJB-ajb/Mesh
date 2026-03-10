-- Migrate feedback from single screenshot_url to screenshot_urls array
ALTER TABLE feedback ADD COLUMN screenshot_urls text[];

UPDATE feedback SET screenshot_urls = ARRAY[screenshot_url] WHERE screenshot_url IS NOT NULL;

ALTER TABLE feedback DROP COLUMN screenshot_url;
