# TODO

- Login needs proper SSO. Sign-in today is a passkey created from the saved panel, not an identity provider.

- Need a UI to show saved places once logged in. The list only appears inside the side panel after sign-in.

- The search bar needs autocomplete that fills in addresses as you type. A search runs only when you submit, and a short list appears afterward if there is more than one hit.
  - English works for ten city names (Tokyo, Sapporo, Fukuoka, Himeji, Yokohama, Osaka, Kyoto, Kobe, Naha, Kanazawa). Any other Latin text goes to Nominatim, limited to Japan.
  - Japanese works through the Geospatial Information Authority address search, then HeartRails for street-level matches.
