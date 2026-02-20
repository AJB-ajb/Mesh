# MeshIt Web App - UX & Bug Report

🔴 Critical Bugs

1. [object Object] Error on Matches Page

Location: /matches
Description: The error message displays "[object Object]" instead of a proper error message
Impact: Extremely unprofessional appearance, confuses users about the actual error
Screenshot Evidence: Visible in the orange-bordered error box
Fix: Convert the error object to a string or extract the error message property before displaying

🟠 Content & Copy Issues 2. Missing Apostrophe in Dashboard Subtitle

Location: /dashboard
Current: "Welcome back! Heres whats happening with your postings."
Should be: "Welcome back! Here's what's happening with your postings."
Impact: Unprofessional, grammatically incorrect

🟡 UX Issues & Improvements 3. Sidebar Inconsistency

Issue: The sidebar remains visible on desktop but the mobile responsiveness wasn't clear
Observation: On smaller screens, there should likely be a hamburger menu or collapsible sidebar
The toggle menu button exists but wasn't fully tested

- Update: this is fine on mobile actually.

4. Empty State Messages Could Be More Actionable

Matches Page: "Unable to Find Matches" with "[object Object]" - should provide clear next steps
Inbox Messages: "No conversations yet" - good but could add a CTA button
Recommended Postings: Message is clear, good job here

5. Search Bar Placeholder Issues

Issue: Shows keyboard shortcut "⌘K" which is Mac-specific
Improvement: Should dynamically show "Ctrl+K" on Windows/Linux or use a platform-agnostic symbol
Good: The search functionality itself works well with results showing postings and people

6. Profile Page - GitHub Integration Warning

Text: "Sign out and sign back in with GitHub to enable this feature."
Issue: This UX flow is cumbersome. Users shouldn't need to sign out to connect GitHub
Improvement: Provide a direct "Connect GitHub" button that triggers OAuth without signing out

- Update: The text might be outdated here; we have explicit connect buttons now; however I'm not sure
  - Issue: this is on top of the page; might be not useful for non-dev users.
  - Note: the connect buttons have an issue: they are inactive if the user isn't in edit profile mode. (They should be active)

7. Date Formatting Inconsistency

Dashboard: Shows "23 hours ago", "4 days ago" (relative time)
Postings: Shows "Today", "2 weeks ago" (mixed format)
Improvement: Use consistent relative time formatting across the app

8. Match Percentage Display

Issue: Multiple postings show "0%" match score on the dashboard activity feed
Impact: Confusing - why would a 0% match be shown as a "new match"?
Improvement: Either don't show matches below a threshold or explain why they're being shown

🟢 Layout & Design Observations 9. Posting Cards Layout

Good: Match percentage badges are prominent and color-coded (green)
Good: Compatibility breakdown is clear and informative
Issue: Some postings have very long descriptions that get truncated - consider showing a preview with "Read more"

10. Form Layout (Create Posting)

Good: AI Extract vs Fill Form toggle is intuitive
Good: Form field organization is logical
Minor: Microphone button icons could be more prominent or have a tooltip

- Note: I think they're actually sufficiently prominent;
- However I would like to have the microphone buttons to be visually integrated into the text input field (e.g. on the right side of the input box) rather than floating separately, which would make it more clear that they're related to the input field and improve the overall aesthetics of the form.

Minor: The example text in the AI Extract textarea is quite long and might overwhelm users

- Note: The text is helpful as a reference, however disappears when the user starts typing. It might be good to have some reference material for stuff to fill out which is still visible when the user is typing.

12. Whitespace & Breathing Room

Generally good spacing throughout the app
Dashboard cards could benefit from slightly more padding
Sidebar icons are well-spaced

🔵 Functional Testing Notes 13. Category Filters on Postings Page

Tested: All, Study, Hackathon, Personal, Professional, Social buttons
Status: Visually present but functionality not tested
Recommendation: Ensure filters work and show results count

14. "Request to Join" vs "Requested" States

Good: Button state changes appropriately (saw "Requested" on AI Data Analysis Dashboard)
Good: Clear visual distinction between states

15. Navigation Flow

Good: Breadcrumb navigation ("Back to postings", "Back to dashboard")
Good: All main navigation items are accessible
Minor: No loading states observed - should test on slower connections

📊 Summary
Total Issues Found: 15

Critical Bugs: 1
Content Issues: 1
UX Improvements: 7
Design Observations: 6

🎯 Priority Recommendations
Fix Immediately:

The [object Object] error display (Critical)
Grammar error in Dashboard subtitle

Fix Soon: 3. GitHub integration UX flow 4. 0% match display logic 5. Keyboard shortcut platform detection
Nice to Have: 6. Consistent date formatting 7. Improved empty states with CTAs 8. More prominent microphone buttons 9. Loading state indicators
Overall, the app has a clean, modern design with good information architecture. The main issues are content/copy related rather than fundamental UX problems. The matching algorithm visualization is particularly well done!
