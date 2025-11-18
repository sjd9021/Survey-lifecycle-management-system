#!/bin/bash

echo "=== Processing Chubb Thread (Policy: 13901027002) ==="
curl -X POST http://localhost:5000/api/process-thread \
  -H "Content-Type: application/json" \
  -d @- << 'CHUBB'
{
  "threadText": "From: \"NJ Insurance\" <nj@gladstoneinsurance.com>\nTo: ronnie@gladstoneinsurance.com\nDate: September 27, 2024\nSubject: Claim Notification - CHUBB 13901027002 - Door Damage\n\nHi Ronnie,\n\nWe have received a claim notification from Chubb for policy number 13901027002.\n\nDetails:\n- Insured: ABC Trading Company\n- Commodity: Electronics\n- Loss: Door damage to container during transit\n- BL Number: MAEU123456789\n- Consignee: XYZ Imports Ltd.\n\nPlease advise on next steps for survey appointment.\n\nRegards,\nNJ Insurance Team\n\n---\n\nFrom: ronnie@gladstoneinsurance.com\nTo: surveyor@marinesurvey.com\nDate: November 17, 2024\nSubject: Re: Claim Notification - CHUBB 13901027002 - Door Damage\n\nDear Surveyor,\n\nCan you please arrange a survey for the above claim? This has been pending for quite some time.\n\nContainer location: Port of Los Angeles\nContact: John Smith - 555-1234\n\nBest regards,\nRonnie\nGladstone Insurance\n\n---\n\nFrom: surveyor@marinesurvey.com\nTo: ronnie@gladstoneinsurance.com\nDate: November 18, 2024\nSubject: Re: Claim Notification - CHUBB 13901027002 - Door Damage\n\nDear Ronnie,\n\nSurvey scheduled for November 20, 2024 at 10:00 AM.\n\nWill send report by end of week.\n\nBest regards,\nMarine Survey Ltd."
}
CHUBB

echo -e "\n\n=== Processing Fujikura Thread (Policy: FUJIKURA-2024-088) ==="
curl -X POST http://localhost:5000/api/process-thread \
  -H "Content-Type: application/json" \
  -d @- << 'FUJIKURA'
{
  "threadText": "From: branch@gladstoneinsurance.com\nTo: ronnie@gladstoneinsurance.com\nDate: November 15, 2024\nSubject: Urgent - Wet condition claim\n\nHi Ronnie,\n\nConsignee reported wet condition on arrival. Need immediate survey.\n\nContainer: TCLU9876543\nCommodity: Optical fiber cables\nValue: $250,000\n\nPlease handle urgently.\n\nBranch Office\n\n---\n\nFrom: ronnie@gladstoneinsurance.com\nTo: ajay@gladstoneinsurance.com\nDate: November 16, 2024\nSubject: Fwd: Urgent - Wet condition claim\n\nAjay,\n\nCan you check if we have policy details for this? Consignee mentioned Fujikura but no policy number in notification.\n\nRonnie\n\n---\n\nFrom: ajay@gladstoneinsurance.com\nTo: ronnie@gladstoneinsurance.com\nDate: November 16, 2024\nSubject: Re: Fwd: Urgent - Wet condition claim\n\nRonnie,\n\nFound it - Policy Number: FUJIKURA-2024-088\nInsured: Fujikura Electronics\nInsurer: QBE\n\nI'll forward the full policy details.\n\nAjay\n\n---\n\nFrom: ronnie@gladstoneinsurance.com\nTo: surveyor@marinesurvey.com\nDate: November 17, 2024\nSubject: Survey Required - FUJIKURA-2024-088 - Wet Condition\n\nDear Surveyor,\n\nPlease arrange urgent survey for wet condition claim:\n\nPolicy: FUJIKURA-2024-088\nContainer: TCLU9876543\nCommodity: Optical fiber cables\nLocation: Port of Oakland\n\nContact: Sarah Johnson - 555-9876\n\nBest regards,\nRonnie"
}
FUJIKURA

echo -e "\n\n=== Fetching Claims ==="
curl http://localhost:5000/api/claims | jq '.'

echo -e "\n\n=== Fetching Stats ==="
curl http://localhost:5000/api/stats | jq '.'
