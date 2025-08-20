<template>
  <v-app>
    <v-main class="bg-blue-grey-lighten-5 d-flex align-center justify-center">
      <v-container class="pa-4">
        <v-card
          class="pa-6 pa-md-8 mx-auto"
          max-width="800"
          elevation="6"
          rounded="lg"
        >
          <h2 class="text-primary">
            <v-icon size="46" class="mr-2">mdi-bus-school</v-icon>
            Phnom Penh Public Transport Planner
          </h2>

          <v-form @submit.prevent="planRoute" class="mt-4">
            <!-- From -->
            <v-autocomplete
              v-model="from"
              :items="fromOptions"
              :loading="fromLoading"
              :filter="() => true"
              @update:search="fetchFromStops"
              label="From"
              placeholder="Search starting stop"
              prepend-inner-icon="mdi-map-marker-outline"
              variant="solo"
              clearable
              required
              class="mb-4"
            />

            <!-- To -->
            <v-autocomplete
              v-model="to"
              :items="toOptions"
              :loading="toLoading"
              :filter="() => true"
              @update:search="fetchToStops"
              label="To"
              placeholder="Search destination stop"
              prepend-inner-icon="mdi-map-marker"
              variant="solo"
              clearable
              required
              class="mb-4"
            />

            <v-btn
              type="submit"
              color="primary"
              block
              :disabled="!from || !to"
              :loading="loading"
            >
              <v-icon left>mdi-transit-connection-variant</v-icon>
              Plan Route
            </v-btn>
          </v-form>
          <!-- {{ result }} -->
          <!-- Result -->
          <div v-if="result" class="mt-6">
            <h3 class="text-primary mb-2">Optimal Route Found:</h3>
            <v-list>
              <v-list-item
                v-for="(step, i) in result.steps"
                :key="i"
                :value="i"
                variant="tonal"
                class="mb-2 rounded-lg"
              >
                <v-icon class="mr-2">
                  {{
                    i === 0
                      ? "mdi-flag-checkered"
                      : i === result.steps.length - 1
                      ? "mdi-flag"
                      : "mdi-arrow-right"
                  }}
                </v-icon>
                {{ step.instruction }}
              </v-list-item>
            </v-list>
            <v-card
              border="start"
              class="pa-4 mt-6 rounded-lg"
              color="blue-lighten-5"
            >
              <div class="font-weight-medium">
                <v-icon class="mr-2" color="blue-darken-2"
                  >mdi-clock-outline</v-icon
                >
                Estimated Travel Time:
                <strong class="text-blue-darken-4"
                  >{{ result.summary.eta_min }} minutes</strong
                >
              </div>
              <div class="font-weight-medium mt-2">
                <v-icon class="mr-2" color="blue-darken-2"
                  >mdi-train-variant</v-icon
                >
                Transfers:
                <strong class="text-blue-darken-4">{{
                  result.summary.transfers
                }}</strong>
              </div>
              <div class="font-weight-medium mt-2">
                <v-icon class="mr-2" color="blue-darken-2">mdi-cash</v-icon>
                Estimated Cost:
                <strong class="text-blue-darken-4"
                  >{{ result.summary.fare_riel }} Riel</strong
                >
              </div>
              <div class="font-weight-medium mt-2">
                <v-icon class="mr-2" color="blue-darken-2">mdi-map</v-icon>
                Distance:
                <strong class="text-blue-darken-4"
                  >{{ result.summary.distance_km }} Km</strong
                >
              </div>
            </v-card>
          </div>

          <!-- Suggestion -->
          <div v-if="suggestion" class="mt-6">
            <h3 class="text-warning mb-2">Suggestion:</h3>
            <v-list>
              <v-list-item
                v-for="(step, i) in suggestion.suggestion.steps"
                :key="i"
              >
                <v-icon class="mr-2">
                  {{
                    i === 0
                      ? "mdi-flag-checkered"
                      : i === suggestion.suggestion.steps.length - 1
                      ? "mdi-flag-variant"
                      : "mdi-arrow-right"
                  }}
                </v-icon>
                {{ step }}
              </v-list-item>
            </v-list>
            <div class="mt-4">
              <p>
                Alternative Destination:
                {{ suggestion.suggestion.alternativeDestination }}
              </p>
              <p>
                Estimated Time: {{ suggestion.suggestion.totalTime }} minutes
              </p>
              <p>Estimated Cost: {{ suggestion.suggestion.totalCost }} Riel</p>
            </div>
          </div>

          <!-- Error -->
          <v-alert v-if="error" type="error" class="mt-6">{{ error }}</v-alert>
        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref } from "vue";
import axios from "axios";

// Reactive states
const from = ref("");
const to = ref("");
const fromOptions = ref([]);
const toOptions = ref([]);
const fromLoading = ref(false);
const toLoading = ref(false);

const result = ref(null);
const suggestion = ref(null);
const error = ref(null);
const loading = ref(false);

// Debounce function to reduce API calls
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Fetch stops for "From"
const fetchFromStops = debounce(async (val) => {
  if (!val || val.length < 2) {
    fromOptions.value = [];
    return;
  }
  fromLoading.value = true;
  try {
    const res = await axios.get("http://localhost:3000/api/stop", {
      params: { q: val },
    });
    fromOptions.value = res.data.records.map(
      (r) => r.departure || r.terminal || r.name
    );
  } catch (e) {
    console.error("Failed fetching 'From' stops:", e);
  } finally {
    fromLoading.value = false;
  }
});

// Fetch stops for "To"
const fetchToStops = debounce(async (val) => {
  if (!val || val.length < 2) {
    toOptions.value = [];
    return;
  }
  toLoading.value = true;
  try {
    const res = await axios.get("http://localhost:3000/api/stop", {
      params: { q: val },
    });
    toOptions.value = res.data.records.map(
      (r) => r.departure || r.terminal || r.name
    );
  } catch (e) {
    console.error("Failed fetching 'To' stops:", e);
  } finally {
    toLoading.value = false;
  }
});

// Plan route
const planRoute = async () => {
  if (!from.value || !to.value) return;
  suggestion.value = null;
  result.value = null;
  error.value = null;
  loading.value = true;
  try {
    const res = await axios.get("http://localhost:3000/api/planner", {
      params: { from: from.value, to: to.value, opt: "balanced" },
    });
    if (res.data.suggestion) {
      suggestion.value = res.data;
    } else {
      result.value = res.data;
    }
  } catch (err) {
    error.value =
      err.response?.data?.message || "Error finding route. Please try again.";
  } finally {
    loading.value = false;
  }
};
</script>
