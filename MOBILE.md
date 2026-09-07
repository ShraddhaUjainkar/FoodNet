# FoodNet Mobile (Android) - React Native / Expo Frontend Specification & Prompt

You are an expert React Native and mobile application developer. Your task is to build a high-performance, visually stunning native Android mobile application for **FoodNet** (an AI-powered food label scanner and food safety analyzer) using **React Native with Expo** and **TypeScript**.

The backend REST API and background workers are already built and running on an Express.js server on port 4000 with PostgreSQL (Neon) and Redis (BullMQ).

---

## 1. Tech Stack & Library Replacements (React.js -> React Native)

| Feature / Domain       | Web (React.js / Next.js)               | React Native (Expo) Replacement                                            |
| :--------------------- | :------------------------------------- | :------------------------------------------------------------------------- |
| **Framework**          | Next.js 15 (App Router)                | **Expo (SDK 51+) with React Native**                                       |
| **Language**           | TypeScript                             | **TypeScript** (`strict: true`)                                            |
| **Styling**            | Tailwind CSS / Vanilla CSS             | **NativeWind (v4)** or **StyleSheet.create**                               |
| **Navigation**         | Next.js `useRouter`, `<Link>`          | **React Navigation 6+** (Bottom Tabs + Native Stack)                       |
| **Camera & Photos**    | `<input type="file" accept="image/*">` | **`expo-image-picker`** & **`expo-camera`**                                |
| **Storage / Cookies**  | `localStorage`, `document.cookie`      | **`@react-native-async-storage/async-storage`**                            |
| **Icons**              | `lucide-react`                         | **`lucide-react-native`**                                                  |
| **Haptics & Feedback** | Web Audio / CSS hover                  | **`expo-haptics`** (vibrations on scan & button presses)                   |
| **Animations**         | CSS Keyframes / Framer Motion          | **`react-native-reanimated`** (v3)                                         |
| **Network & Polling**  | Standard Web `fetch`                   | **`fetch` / `axios`** with Android LAN IP handling                         |
| **Authentication**     | NextAuth.js Google Provider            | **`@react-native-google-signin/google-signin`** or **`expo-auth-session`** |

---

## 2. Core UI Components Conversion Rules

1. **HTML Elements Conversion:**
   - `<div>`, `<section>`, `<main>` ➔ `<View>` or `<SafeAreaView>` (from `react-native-safe-area-context`)
   - `<p>`, `<span>`, `<h1>`–`<h6>` ➔ `<Text>` (All text must always be wrapped inside `<Text>`)
   - `<button>` ➔ `<TouchableOpacity activeOpacity={0.7}>` or `<Pressable>`
   - `<input type="text">`, `<textarea>` ➔ `<TextInput>`
   - `<img>` ➔ `<Image>` (from `expo-image` for hardware caching)
   - Lists (`.map(...)`) ➔ `<FlatList>` or `<ScrollView>` with `showsVerticalScrollIndicator={false}`

2. **Network IP Configuration for Android:**
   - In Android emulators, `localhost` points to the internal emulator loopback. Use:
     - **Android Emulator:** `http://10.0.2.2:4000`
     - **Physical Android Device:** `http://<YOUR_COMPUTER_LOCAL_IP>:4000` (e.g., `http://192.168.1.5:4000`)
     - **Production:** `https://api.yourdomain.com`

---

## 3. Mobile Screens & Layout Architecture

### Navigation Structure

- **Root Navigator (`NavigationContainer`):**
  - **MainTabs (Bottom Tab Bar):**
    - **Scanner (Home):** Tab icon `ScanLine`
    - **Vault (History):** Tab icon `Clock`
    - **Profile:** Tab icon `User`
  - **Modal Stack Screens:**
    - **ReportScreen (`/scan/:id`):** Deep linked, opened after scan finishes.
    - **LiveCameraScreen:** Fullscreen viewfinder for taking label snapshots.

---

### Screen 1: Scanner / Home Screen (`HomeScreen.tsx`)

- **Header Bar:** FoodNet logo on left, current guest scan badge ("3 of 5 free scans") or user avatar on right.
- **Hero Section:**
  - Punchy title: _"Know what you eat before you take a bite"_.
  - Segmented Control tabs: **[ Snap Photo ]** and **[ Paste Ingredients ]**.
- **Photo Capture Card (Primary Action):**
  - Large, card with rounded corners (`rounded-3xl`), dashed border, and vibrant gradient icon.
  - **Two Action Buttons:**
    1. **"Open Camera"** (triggers camera capture via `expo-image-picker` with `allowsEditing: true`).
    2. **"Choose from Gallery"** (triggers image library selector).
  - Preview thumbnail with clear button if an image is selected.
- **Text Mode Card (Alternative Tab):**
  - Multiline `<TextInput>` with paste button and placeholder: _"e.g. Sugar, Palm Oil, Cocoa Butter, Soy Lecithin..."_.
- **CTA Button:**
  - Fixed at bottom of card: _"Analyze Ingredients"_ button with pulse animation.

---

### Screen 2: Real-time Analysis Overlay (`ProgressBottomSheet.tsx`)

- Replace the web modal with a smooth **bottom sheet / modal overlay** (`react-native-reanimated`).
- **Content:**
  - Title: _"Analyzing Food Packaging"_ with subtle spinner.
  - **Vertical Step Stepper (5 Steps):**
    1. `upload` ➔ _"Uploading image"_
    2. `ocr` ➔ _"Reading label (Extracting text)"_
    3. `identify` ➔ _"Identifying ingredients against database"_
    4. `health` ➔ _"Evaluating health score & additives"_
    5. `report` ➔ _"Generating verdict & alternatives"_
  - Each step displays:
    - State: `pending` (gray circle), `processing` (pulsing red/orange ring), `completed` (green checkmark), `failed` (red X).
  - **Progress Bar:** Smooth animated bar showing `0%` to `100%`.
  - Triggers haptic feedback (`Haptics.notificationAsync`) when each step completes.

---

### Screen 3: Report / Product Details Screen (`ReportScreen.tsx`)

- **Top Header Card (Hero Verdict):**
  - Giant Health Grade Badge:
    - **Grade A / B:** Emerald green gradient (`#059669` to `#10B981`)
    - **Grade C:** Amber gradient (`#D97706` to `#F59E0B`)
    - **Grade D / E:** Crimson gradient (`#DC2626` to `#EF4444`)
  - Score gauge: e.g., `84 / 100`.
  - Product Title, Brand, and Image thumbnail.
- **AI Safety Summary Card:**
  - Clean card with sparkle icon: AI-generated human-friendly analysis verdict.
- **Quick Stats Pill Row (Horizontal Scroll):**
  - `Safe: X` (Green pill) | `Caution: Y` (Yellow pill) | `Avoid: Z` (Red pill) | `Allergens: N`
- **Ingredient List Section:**
  - Expandable list items. Each card displays:
    - Ingredient name + safety badge (`Safe` / `Caution` / `Avoid`).
    - Percentage (if detected) and evidence level.
    - Expand on tap to reveal: scientific description, dietary purpose, and health impact.
- **Flagged Additives & Allergens Section:**
  - Highlighted cards for E-numbers (e.g. `E150d Caramel Color`, `E621 MSG`) with caution warnings.
- **Healthier Alternatives Carousel:**
  - Horizontal `<ScrollView>` showing 2–3 better food swaps with higher grades, scores, and names.
- **Bottom Action Bar:**
  - Sticky bottom buttons: **"Scan Another Item"** & **"Share Report"**.

---

### Screen 4: Scan Vault / History Screen (`VaultScreen.tsx`)

- **Top Bar:** Search input + Filter chips: `[ All ]`, `[ Grade A/B ]`, `[ Flagged Avoids ]`.
- **Guest Alert Card (if guest):**
  - Warning card: _"You are using a 7-day temporary session. Sign in to keep your scans forever."_ + _"Sign in with Google"_ CTA button.
- **Scan Cards (`FlatList`):**
  - Product name / date timestamp.
  - Safety grade badge + score pill.
  - Ingredients count, avoids count.
  - Swipe-to-delete action (`Swipeable` from `react-native-gesture-handler`) calling `DELETE /api/v1/scans/:id`.
  - Pull-to-refresh (`RefreshControl`).

---

### Screen 5: Profile & Settings Screen (`ProfileScreen.tsx`)

- **Authenticated View:**
  - Avatar image, full name, email with "Google Verified" badge.
  - Aggregate stats grid:
    - Total Scans Conducted
    - Potentially Harmful Additives Avoided
    - Average Health Score
  - Sign Out button with confirmation dialog.
- **Guest View:**
  - Guest badge (`"Temporary Session"`).
  - Remaining scans circular progress (e.g., 2 / 5 scans used).
  - **"Claim & Save Forever"** button that initiates Google Sign-In and triggers `POST /api/v1/scans/migrate`.

---

## 4. Backend API Integration Specifications

### Base URL & Client:

```typescript
// src/api/client.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export const API_BASE_URL = __DEV__
  ? Platform.OS === "android"
    ? "http://10.0.2.2:4000" // Android Emulator local host
    : "http://localhost:4000"
  : "https://api.yourproductiondomain.com";

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const userId = await AsyncStorage.getItem("foodnet_user_id");
  const guestId = await AsyncStorage.getItem("foodnet_guest_id");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (userId) {
    headers["x-user-id"] = userId;
  } else if (guestId) {
    headers["x-guest-id"] = guestId;
  }

  return headers;
}
```
