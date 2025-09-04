Now that we have this app working I want to create a
secondary app.

The new app will allow the user to email a contract to an email address
Then the info I am requesting will be formatted in an email that the end user can then forward to the listing agent.
The idea is to have a nicely formatted offer sheet (just inside the email not a separate doc) that will make the offer simple for all parties to understand
We will also send back the original contract so the end user can simply forward the email

Not 100% sure how to do that it needs to be separate and what the new app is going to do is once again extract all the data from the
contract except this time I want it to create a specific list of items and I will show you the exact format.

I would like to use our Azure account to send the email back once the contract info is extracted and formatted in the email.

 
Example Output

Buyer Name: Bob Jones & Sue Jones

Purchase Price: $356,000

Seller Concessions: $5000

Close Date: 10/23/25

Contingency: Sale of house at 123 Main St

Earnest Money: Yes

Non-Refundable Deposit: No

Items to Convey: Refrigerator

Home Warranty: Yes - $695 

Survey: No 

 

Home Warranty, Survey, Contingency will only be included on
files where it is relevant in other words if there is no contingency then it will skip that all together.



 

Here are the pages and paragrahs we need 

Purchase Price - page 1 - para 3

Seller Concessions - page 4 - para 5

Buyer Name - page 1 - para 1

Close Date - page 12 - para 22

EMD - Y/N - page 4 - para 7

NRD - Y/N - Amount page 4 - para 8

Additional Info - page 14 para 32

Items to Convey - page 6 para 13

Home Warranty - page 8 para 15

Survey - pag3- 6 para 11


