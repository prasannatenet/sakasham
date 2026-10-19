# Public Website API

This document describes the public API exposed by the CRM for the website
developer.

## Environments and base URL

| Environment | Base URL |
| --- | --- |
| Production | `https://crm.sakshampackersandmovers.com/api` |
| Local development | `http://127.0.0.1:8000/api` |

The public website origin is `https://sakshampackersandmovers.com`. API requests
must use the CRM API base URL above, not the CRM's server-rendered page URLs.

Catalog and suggestion endpoints are public. Creating an enquiry requires no
authentication; completing one requires the booking token returned at
creation. Send and receive JSON using the `Accept: application/json` header.
For JSON request bodies, also send `Content-Type: application/json`.

## Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/enquiries` | Create an enquiry from the website's Check Price form |
| `POST` | `/enquiries/{enquiry_id}/booking` | Submit all customer details, selected items, and vehicle when the user requests the booking |
| `GET` | `/enquiries/items` | Read the active moving-item catalog, grouped by category |
| `GET` | `/enquiries/vehicles` | Read the active vehicle catalog |
| `GET` | `/service-locations/suggestions?q={query}` | Search service cities and places |

Do not post to `/enquiries/items`, `/enquiries/vehicles`, or
`/enquiries/details` on the CRM host; those are server-rendered website routes
and redirect to CRM login. Use the booking submission API below to save the
completed booking.

## Create an enquiry

### `POST /enquiries`

Call this endpoint when the visitor submits the website's Check Price form. A
successful request immediately creates a `moving_enquiries` record with the
visitor's name, route, mobile number, and preferred move date.

#### Request body

The field names used by the current public website are supported:

```json
{
  "name": "Asha Verma",
  "pickup_city": "Mumbai",
  "drop_city": "Pune",
  "mobile": "9876543210",
  "preferred_date": "2026-11-02"
}
```

The following equivalent API field names are also supported. If both names in
a pair are supplied, the first (API) name takes precedence:

| API field | Website form field | Required | Rules |
| --- | --- | --- | --- |
| `name` | `name` | Yes | String, max 120 characters |
| `pickup_location` | `pickup_city` | Yes | String, max 120 characters |
| `drop_location` | `drop_city` | Yes | String, max 120 characters |
| `phone` | `mobile` | Yes | String, max 20 characters; numbers and `+`, `-`, spaces, parentheses only; 6-20 characters |
| `shifting_date` | `preferred_date` | Yes | `YYYY-MM-DD`, today or a future date |

#### Successful response — `201 Created`

```json
{
  "message": "Enquiry received successfully",
  "data": {
    "id": 123,
    "name": "Asha Verma",
    "pickup_location": "Mumbai",
    "drop_location": "Pune",
    "phone": "9876543210",
    "shifting_date": "2026-11-02",
    "booking_token": "a-64-character-secret-token"
  }
}
```

Keep both `data.id` and `data.booking_token` until the user submits the final
booking form. The token is a secret credential for this enquiry: do not put it
in a URL, log it, or expose it to third parties. The server stores only a hash
of the token. The ID alone cannot authorize a booking update.

#### Example using `fetch`

```js
const response = await fetch(
  'https://crm.sakshampackersandmovers.com/api/enquiries',
  {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: form.name,
      pickup_city: form.pickupCity,
      drop_city: form.dropCity,
      mobile: form.mobile,
      preferred_date: form.preferredDate,
    }),
  },
);

const result = await response.json();

if (!response.ok) {
  // A 422 response contains field-specific errors in result.errors.
  throw new Error(result.message ?? 'Unable to submit the enquiry');
}

sessionStorage.setItem('movingEnquiry', JSON.stringify({
  id: result.data.id,
  bookingToken: result.data.booking_token,
}));

console.log('Enquiry created:', result.data.id);
```

#### Validation error — `422 Unprocessable Content`

Laravel returns a JSON validation response. Each key in `errors` is the field
that failed validation.

```json
{
  "message": "The pickup location field is required.",
  "errors": {
    "pickup_location": [
      "The pickup location field is required."
    ]
  }
}
```

#### Rate limit — `429 Too Many Requests`

The create endpoint is limited to 10 requests per minute. Avoid automatically
retrying a `429` immediately.

## Submit the completed booking

### `POST /enquiries/{enquiry_id}/booking`

Call this when the visitor has selected their moving items and vehicle, entered
their contact/address details, and clicks the final **Request Booking** button.
The endpoint updates the enquiry created by `POST /enquiries`; it does not
create a second booking. One database transaction saves the customer details,
pickup/drop date-times, vehicle preference, and all selected items with
quantities. The completed enquiry then appears in the CRM admin bookings and
customer records.

The `{enquiry_id}` and `booking_token` must be the values returned by the
initial Check Price request. Keep these values in frontend state (for example,
`sessionStorage`) as the visitor proceeds through the external website's
pages. If the browser loses them, restart the Check Price request.

Before enabling this endpoint in a deployment, run the pending database
migration (`php artisan migrate --force`) so the booking-token hash column is
available.

#### Request body

```json
{
  "booking_token": "a-64-character-secret-token",
  "name": "Asha Verma",
  "email": "asha@example.com",
  "mobile": "9876543210",
  "pickup_city": "Mumbai",
  "pickup_address": "12 MG Road",
  "pickup_map_link": "https://maps.google.com/?q=pickup",
  "pickup_date": "2026-11-02",
  "pickup_time": "10:30",
  "drop_city": "Pune",
  "drop_address": "44 Residency Road",
  "drop_map_link": "https://maps.google.com/?q=drop",
  "drop_date": "2026-11-03",
  "drop_time": "14:00",
  "vehicle_id": 7,
  "items": [
    {
      "item_id": 12,
      "variation_id": 34,
      "quantity": 2
    },
    {
      "item_id": 18,
      "variation_id": null,
      "quantity": 1
    }
  ]
}
```

`pickup_map_link`, `drop_map_link`, `pickup_time`, and `drop_time` are optional.
Times use 24-hour `HH:mm` format. Do not send meridiem fields when using this
format. If no vehicle is selected, send `"vehicle_id": null`. Send `"items": []`
when the customer has no item selection. Each selected item must include the
catalog `item_id`, its `variation_id` or `null`, and a quantity from 1 to 999.
Use the IDs from `GET /enquiries/items` and `GET /enquiries/vehicles`; prices
are calculated from the CRM catalog, not from prices submitted by the browser.

#### Successful response — `200 OK`

```json
{
  "message": "Booking request received successfully",
  "data": {
    "id": 123,
    "status": "submitted"
  }
}
```

#### Invalid/expired enquiry token — `404 Not Found`

The enquiry ID and token must match. The API returns `404` for a missing
enquiry, a wrong token, or an enquiry that predates booking-token support.
Treat this response as a reason to restart the Check Price request.

#### Validation error — `422 Unprocessable Content`

Invalid or unavailable vehicle/item/variation IDs, an invalid date or time, or
missing customer details return `422` with field-specific errors in `errors`.
For example:

```json
{
  "message": "The email field must be a valid email address.",
  "errors": {
    "email": [
      "The email field must be a valid email address."
    ]
  }
}
```

#### Example using `fetch`

```js
const response = await fetch(
  `https://crm.sakshampackersandmovers.com/api/enquiries/${enquiry.id}/booking`,
  {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      booking_token: enquiry.bookingToken,
      name: form.name,
      email: form.email,
      mobile: form.mobile,
      pickup_city: form.pickupCity,
      pickup_address: form.pickupAddress,
      pickup_map_link: form.pickupMapLink || null,
      pickup_date: form.pickupDate,
      pickup_time: form.pickupTime || null,
      drop_city: form.dropCity,
      drop_address: form.dropAddress,
      drop_map_link: form.dropMapLink || null,
      drop_date: form.dropDate,
      drop_time: form.dropTime || null,
      vehicle_id: form.vehicleId || null,
      items: form.items.map((item) => ({
        item_id: item.itemId,
        variation_id: item.variationId || null,
        quantity: item.quantity,
      })),
    }),
  },
);

const result = await response.json();

if (!response.ok) {
  if (response.status === 422) {
    // Display result.errors next to the corresponding fields.
  }

  throw new Error(result.message ?? 'Unable to submit the booking');
}

// Show the booking confirmation, then discard the stored ID and token.
console.log('Booking submitted:', result.data.id);
```

In this example, `enquiry` is the object restored from the Check Price step:

```js
const enquiry = JSON.parse(sessionStorage.getItem('movingEnquiry') ?? 'null');

if (!enquiry) {
  throw new Error('Please restart the Check Price request before booking.');
}
```

## Read moving items

### `GET /enquiries/items`

Returns active categories and their active items/variations, in display order.
Categories with no active items are included. Inactive categories, items, and
variations are omitted.

#### Successful response — `200 OK`

```json
{
  "data": [
    {
      "id": 4,
      "name": "Furniture",
      "image_url": "https://crm.sakshampackersandmovers.com/storage/categories/furniture.jpg",
      "items": [
        {
          "id": 12,
          "name": "Sofa",
          "slug": "sofa",
          "description": "Three-seat sofa",
          "image_url": "https://crm.sakshampackersandmovers.com/storage/items/sofa.jpg",
          "price_paise": 12000,
          "unit": "piece",
          "variations": [
            {
              "id": 34,
              "name": "Three seater",
              "description": null,
              "price_paise": 15000
            }
          ]
        }
      ]
    }
  ]
}
```

Image URLs can be `null` when no image has been uploaded. Prices are integer
paise (100 paise = INR 1). A variation's `price_paise` is its own price when
configured, otherwise it falls back to its parent item's price.

## Read vehicles

### `GET /enquiries/vehicles`

Returns active vehicles in display order.

#### Successful response — `200 OK`

```json
{
  "data": [
    {
      "id": 7,
      "name": "Mini Truck",
      "type": "Truck",
      "image_url": null,
      "payload_kg": 1000,
      "dimensions_cm": {
        "length": 300,
        "width": 150,
        "height": 150
      },
      "base_price_paise": 50000,
      "price_per_km_paise": 1500
    }
  ]
}
```

Vehicle prices are integer paise. An image URL is `null` when the vehicle has
no uploaded image.

## Search service locations

### `GET /service-locations/suggestions?q={query}`

Searches supported cities, states, local places, and postal codes. URL-encode
the query. The query must contain 2-120 characters. At most 10 suggestions are
returned.

#### Example request

```text
GET https://crm.sakshampackersandmovers.com/api/service-locations/suggestions?q=Jaipur
```

#### Successful response — `200 OK`

This endpoint returns a JSON array directly (not an object with a `data` key):

```json
[
  {
    "label": "Jaipur, Rajasthan (City)",
    "value": "Jaipur, Rajasthan"
  },
  {
    "label": "Vaishali Nagar, Jaipur, Rajasthan - 302021",
    "value": "Vaishali Nagar, Jaipur, Rajasthan - 302021"
  }
]
```

## Cross-origin requests (CORS)

The CRM allows browser requests from `https://sakshampackersandmovers.com` by
default. If the website uses another origin (for example, `www` or a staging
domain), the CRM deployment must add that exact origin to its
`CORS_ALLOWED_ORIGINS` environment variable, as a comma-separated list.
Origins include the scheme and host, but no path.

Allowed methods are `GET`, `POST`, and `OPTIONS`. Allowed request headers are
`Accept`, `Content-Type`, and `X-Requested-With`. Public API calls do not need cookies or an `Authorization` header. The booking
token is sent in the JSON body for the final booking endpoint.
