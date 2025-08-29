# ARKANSAS CONTRACT EXTRACTION - FINAL FIELD REQUIREMENTS
## DO NOT MODIFY WITHOUT USER APPROVAL
## Created: 2025-08-28

This document defines the EXACT 28 fields needed for extraction. Any changes require explicit user approval.

## TOTAL FIELDS NEEDED: 28 (not 37, not 41, exactly 28)

### PAGE 1 (5 fields)
1. **buyers** - Array of buyer names (KEEP)
2. **property_address** - Full property address (KEEP)
3. **purchase_price** - Amount if financed (3A), null if cash (KEEP)
4. **cash_amount** - Amount if cash (3C), null if financed (KEEP)  
5. **loan_type** - Loan type if financed, null/CASH if cash (KEEP)

### PAGE 4 (3 fields)
6. **seller_pays_buyer_costs** - Amount seller pays toward buyer costs (KEEP)
7. **earnest_money** - "A" or "B" checkbox (KEEP)
8. **non_refundable** - YES/NO (KEEP)
9. **non_refundable_amount** - Amount if non-refundable (KEEP)

### PAGE 5 (1 field)
10. **para10_title_option** - "A", "B", or "C" (KEEP)

### PAGE 6 (4 fields)
11. **para11_survey_option** - "A", "B", or "C" (KEEP)
12. **para11_survey_paid_by** - "Buyer", "Seller", or "Split" if option A (KEEP)
13. **para13_items_included** - Items in first blank (KEEP)
14. **para13_items_excluded** - Items in second blank (KEEP)

### PAGE 7 (2 NEW fields)
15. **para14_contingency** - "A" or "B" (NEW)
16. **para14_binding_type** - "(i)" or "(ii)" if B selected (NEW)
    - If (i): Note "Binding Contingency with Escape Clause - See Contract"
    - If (ii): Note "Binding Contingency without Escape Clause - See Contract"

### PAGE 8 (3 fields)
17. **para15_home_warranty** - "A", "B", "C", or "D" (KEEP)
18. **para15_warranty_paid_by** - Who pays for warranty (KEEP)
19. **para15_warranty_cost** - Cost if seller pays, 0 if buyer pays (KEEP)

### PAGE 10 (1 field)
20. **para19_termite_option** - "A" or "B" (KEEP)

### PAGE 12 (1 field)
21. **closing_date** - Closing date in MM/DD/YYYY format (KEEP)

### PAGE 14 (2 fields)
22. **buyer_agency_fee** - Commission percentage or amount (KEEP)
23. **other_terms** - Non-commission terms for agent info sheet (KEEP)

### PAGE 16 (6 fields)
24. **para38_expiration_date** - Offer expiration date (KEEP)
25. **selling_firm_name** - Brokerage name (KEEP)
26. **selling_agent_name** - Agent name (KEEP)
27. **selling_agent_arec** - Agent license number (KEEP)
28. **selling_agent_email** - Agent email (KEEP)
29. **selling_agent_phone** - Agent phone (KEEP)

## DELETED FIELDS (DO NOT EXTRACT)
- property_type
- para3_option_checked
- para5_seller_pays_text (merged into seller_pays_buyer_costs)
- earnest_money_amount
- earnest_money_holder
- non_refundable_when
- para10_details
- para15_warranty_company
- para15_other_details
- para19_termite_details
- para32_additional_terms
- para38_expiration_time
- selling_agent_mls (doesn't exist)

## IMPORTANT NOTES
1. Count extraction success as X/28 fields, not 37 or 41
2. Pages 7 and 8 were previously confused - para 14 is on page 7, para 15 is on page 8
3. Two new fields added for para 14 contingency on page 7
4. seller_pays_buyer_costs is a combined field from old para5_custom_text and para5_seller_pays_text
5. This list was created after extensive review on 2025-08-28 - DO NOT CHANGE without explicit approval