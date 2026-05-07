# Source: WordPress Forms & Pages — Complete Inventory
> Source: phpMyAdmin SQL query on Raidboxes DB, May 2026.
> Database table: `cqen_posts` (WordPress posts table — holds both pages and CF7 forms)
> Plugin: Contact Form 7 (forms) + Flamingo (submission storage)
> Do not use as primary reference. Confirmed business rules → [`../business_rules.md`](../business_rules.md) §12. Open questions → [`../open_questions.md`](../open_questions.md) §12.

---

## All 17 Contact Form 7 Forms

### Customer-Facing (Public)

| Form ID | Form Name (German → English) | Page URL(s) | Notes |
|---------|------------------------------|-------------|-------|
| 6378 | Anfrage → Inquiry | 40+ service pages | Main customer intake — on every service page |
| 41156 | Anfrage KURZ → Short Inquiry | /ghostwriter/ (home) | Shortened version of 6378, homepage only |
| 42844 | Anfrage B2B → B2B Inquiry | /fuer-unternehmen/ | Separate B2B customer segment |
| 7308 | Anfrage für Lektorat & Korrekturlesen → Proofreading request | /kontakt-fuer-lektorat-korrekturlesen/ | Proofreading-specific intake |

### GW / Expert Recruitment (Semi-public)

| Form ID | Form Name (German → English) | Page URL(s) | Notes |
|---------|------------------------------|-------------|-------|
| 6514 | Bewerbung → Application | /als-ghostwriterin-bewerben/ + /als-expertin-bewerben/ | Same form serves two separate tracks: GW track AND Expert (tutor/coach) track |

### GW Operations (Hidden — not indexed, not in sitemap)

| Form ID | Form Name (German → English) | Page URL | Notes |
|---------|------------------------------|----------|-------|
| 6736 | Ghostwriter ID Anfrage → GW ID Request | /ghostwriter-dashboard/ | GW identifies themselves to claim/access a job |
| 7880 | Ghostwriter Onboarding | /ghostwriter-onboarding/ | New GW setup form |
| 7893 | Ghostwriter Zwischenstand → GW Interim Status | /ghostwriter-zwischenstand/ | Interim draft submission |
| 7897 | Ghostwriter Finale Mustervorlage → GW Final Template | /ghostwriter-endstand/ | Final work submission |
| 8132 | Rechungsinformationen → Invoice Information | /rechnung-anfordern/ | GW invoice submission; also used for order extensions |

### Lead Generation / Email Capture

| Form ID | Form Name (German → English) | Page URL | Notes |
|---------|------------------------------|----------|-------|
| 41607 | Ressourcen_download → Resources Download | /ressourcen-fuer-deine-thesis-downloaden/ | Email gate → user gets thesis resources PDF |
| 41819 | ThesisCrashkurs_download → Thesis Crash Course Download | /kostenlosen-thesis-crashkurs-downloaden/ | Email gate → user gets free crash course |

### Growth / Partner Program

| Form ID | Form Name (German → English) | Page URL | Notes |
|---------|------------------------------|----------|-------|
| 8150 | Freunde werben Freunde → Friends Refer Friends | /freunde-werben-freunde/ | Referral program |
| 38976 | efactory1 Partnerprogramm Registrierung → Partner Program Registration | /partner-registrierung/ | Affiliate/partner onboarding |
| 38981 | efactory1 Partneranfrage → Partner Request | /partneranfrage/ | Partner inquiry |

### Junk — Should Be Deleted

| Form ID | Form Name | URL | Action |
|---------|-----------|-----|--------|
| 6348 | Kontaktformular 1 | NULL (orphaned — no pages) | Delete — never used |
| 25962 | Test222334 | /testformulllrar/ | Delete — test debris |

---

## All WordPress Pages → Forms (Page → Form View)

| Page ID | Page Title (German → English) | Form(s) |
|---------|-------------------------------|---------|
| 4730 | Home | 6378: Anfrage, 41156: Anfrage KURZ |
| 4733 | Über uns → About Us | 6378: Anfrage |
| 4734 | So funktioniert es → How it works | 6378: Anfrage |
| 4735 | Kontakt → Contact | 6378: Anfrage |
| 6434 | Hausarbeit Alt → Homework (old) | 6378: Anfrage |
| 6438 | Bachelorarbeit alt → Bachelor's thesis (old) | 6378: Anfrage |
| 6442 | Masterarbeit → Master's thesis | 6378: Anfrage |
| 6447 | Doktorarbeit alt → PhD dissertation (old) | 6378: Anfrage |
| 6494 | FAQ | 6378: Anfrage |
| 6548 | Lektorat → Proofreading/editing | 6378: Anfrage |
| 6551 | Exposé → Research proposal | 6378: Anfrage |
| 6554 | Statistische Auswertung Alt → Statistical analysis (old) | 6378: Anfrage |
| 6730 | Ghostwriter Dashboard | 6736: Ghostwriter ID Anfrage |
| 6760 | Ratgeber → Guide/blog | 6378: Anfrage |
| 6853 | Für Unternehmen → For Companies | 42844: Anfrage B2B |
| 7306 | Kontakt für Lektorat & Korrekturlesen → Proofreading contact | 7308: Anfrage für Lektorat |
| 7428 | Wissensdatenbank → Knowledge base | 6378: Anfrage |
| 7881 | Ghostwriter Onboarding | 7880: Ghostwriter Onboarding |
| 7894 | Ghostwriter Zwischenstand → GW Interim Status | 7893: Ghostwriter Zwischenstand |
| 7898 | Ghostwriter Endstand → GW Final Submission | 7897: Ghostwriter Finale Mustervorlage |
| 7910 | Alles was Du zum Ghostwriting wissen musst! | 6378: Anfrage |
| 8035 | Hausarbeit2 → Homework v2 | 6378: Anfrage |
| 8128 | Rechnung anfordern → Request invoice | 8132: Rechungsinformationen |
| 8140 | Freunde werben Freunde → Friends refer friends | 8150: Freunde werben Freunde |
| 13963 | Als Ghostwriter:in bewerben → Apply as ghostwriter | 6514: Bewerbung |
| 32617 | Als Expert:in bewerben → Apply as expert | 6514: Bewerbung |
| 38971 | Partner Registrierung → Partner registration | 38976: Partnerprogramm Registrierung |
| 38982 | Partneranfrage → Partner inquiry | 38981: Partneranfrage |
| 41603 | Ressourcen für deine Thesis downloaden! | 41607: Ressourcen_download |
| 41811 | Kostenlosen Thesis Crashkurs downloaden! | 41819: ThesisCrashkurs_download |
| 25963 | Testformulllrar | 25962: Test222334 — **DELETE** |

> Note: Form 6378 (Anfrage) also appears on many more service/blog/SEO article pages not listed above. The list above is the confirmed complete set from the DB query.

---

## Corrections to Earlier Analysis

1. **Download pages DO have forms** — they are email capture gates, not just download buttons. User fills in details → gets the PDF. Earlier analysis (before DB query) incorrectly said "No form."
2. **Correct download page URLs:**
   - Was: `/download-fuer-materialien/` → Actual: `/ressourcen-fuer-deine-thesis-downloaden/`
   - Was: `/download-fuer-thesis-crashkurs/` → Actual: `/kostenlosen-thesis-crashkurs-downloaden/`
3. **Expert track exists separately from GW track** — same form (6514) serves two different roles via two different pages. What "Expert" means vs "GW" is open question N-10.
4. **B2B segment is live** — dedicated form (42844) and page (/fuer-unternehmen/) exist.

---

## SQL Queries (for future DB re-runs on Raidboxes)

### Form → Pages (which forms appear on which pages)

```sql
SELECT
    f.ID AS form_id,
    f.post_title AS form_title,
    GROUP_CONCAT(p.ID ORDER BY p.ID) AS used_in_pages,
    GROUP_CONCAT(p.post_title ORDER BY p.ID SEPARATOR ' | ') AS used_in_page_titles,
    GROUP_CONCAT(CONCAT('https://efactory1.de/', p.post_name, '/') ORDER BY p.ID SEPARATOR ' | ') AS page_urls
FROM cqen_posts f
LEFT JOIN cqen_posts p
    ON p.post_type = 'page'
    AND p.post_status = 'publish'
    AND CAST(REGEXP_REPLACE(REGEXP_SUBSTR(p.post_content, 'form_id[[:space:]]*=[[:space:]]*""[0-9]+""'), '[^0-9]', '') AS UNSIGNED) = f.ID
WHERE f.post_type = 'wpcf7_contact_form'
GROUP BY f.ID, f.post_title
ORDER BY f.ID;
```

### Page → Forms (which pages use which forms)

```sql
SELECT
    p.ID,
    p.post_title,
    GROUP_CONCAT(DISTINCT CONCAT(f.ID, ': ', f.post_title) ORDER BY f.ID SEPARATOR ', ') AS forms
FROM (
    SELECT ID, post_title,
        REGEXP_REPLACE(REGEXP_SUBSTR(post_content, 'form_id[[:space:]]*=[[:space:]]*""[0-9]+""', 1, n.n), '[^0-9]', '') AS form_id
    FROM cqen_posts
    JOIN (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
          UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10) n
    WHERE post_type IN ('post','page')
      AND post_content LIKE '%[exp_contact_form7%'
) extracted
JOIN cqen_posts p ON p.ID = extracted.ID
LEFT JOIN cqen_posts f ON f.ID = extracted.form_id
WHERE extracted.form_id IS NOT NULL
GROUP BY p.ID, p.post_title
ORDER BY p.ID;
```
