<template>
  <v-app>
    <v-main class="bg-blue-grey-lighten-5 d-flex align-center justify-center">
      <v-container class="pa-4">
        <v-card
          class="pa-6 pa-md-8 mx-auto"
          max-width="700"
          elevation="6"
          rounded="lg"
        >
          <h2 class="text-primary">
            <v-icon size="46" class="mr-2">mdi-bus-school</v-icon>
            Phnom Penh Bus Route Planner
          </h2>

          <v-form @submit.prevent="planRoute" class="mt-4">
            <v-select
              v-model="from"
              :items="stops"
              label="From"
              placeholder="Select a starting point"
              prepend-inner-icon="mdi-map-marker-outline"
              variant="solo"
              required
              clearable
              class="mb-4"
            ></v-select>

            <v-select
              v-model="to"
              :items="stops"
              label="To"
              placeholder="Select a destination"
              prepend-inner-icon="mdi-map-marker"
              variant="solo"
              required
              clearable
              class="mb-4"
            ></v-select>

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

          <v-divider class="my-6"></v-divider>

          <v-expand-transition>
            <div v-if="result">
              <h3 class="mb-4 text-primary">
                <v-icon class="mr-2">mdi-routes</v-icon>
                Optimal Route Found:
              </h3>

              <v-list>
                <v-list-item
                  v-for="(step, i) in result.steps"
                  :key="i"
                  :value="i"
                  variant="tonal"
                  class="mb-2 rounded-lg"
                >
                  <template #prepend>
                    <v-icon
                      :color="
                        i === 0
                          ? 'success'
                          : i === result.steps.length - 1
                          ? 'error'
                          : 'info'
                      "
                    >
                      {{
                        i === 0
                          ? "mdi-flag-checkered"
                          : i === result.steps.length - 1
                          ? "mdi-flag"
                          : "mdi-arrow-right"
                      }}
                    </v-icon>
                  </template>
                  <span class="font-weight-medium">{{ step }}</span>
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
                    >{{ result.totalTime }} minutes</strong
                  >
                </div>
                <div class="font-weight-medium mt-2">
                  <v-icon class="mr-2" color="blue-darken-2"
                    >mdi-train-variant</v-icon
                  >
                  Transfers:
                  <strong class="text-blue-darken-4">{{
                    result.transfers
                  }}</strong>
                </div>
                <div class="font-weight-medium mt-2">
                  <v-icon class="mr-2" color="blue-darken-2">mdi-cash</v-icon>
                  Estimated Cost:
                  <strong class="text-blue-darken-4"
                    >{{ result.totalCost }} Riel</strong
                  >
                </div>
              </v-card>
            </div>
          </v-expand-transition>

          <v-expand-transition>
            <div v-if="suggestion">
              <h3 class="mb-4 text-warning">
                <v-icon class="mr-2">mdi-alert</v-icon>
                {{ suggestion.message }}
              </h3>
              <v-list>
                <v-list-item
                  v-for="(step, i) in suggestion.suggestion.steps"
                  :key="i"
                  :value="i"
                  variant="tonal"
                  class="mb-2 rounded-lg"
                >
                  <template #prepend>
                    <v-icon
                      :color="
                        i === 0
                          ? 'success'
                          : i === suggestion.suggestion.steps.length - 1
                          ? 'warning'
                          : 'info'
                      "
                    >
                      {{
                        i === 0
                          ? "mdi-flag-checkered"
                          : i === suggestion.suggestion.steps.length - 1
                          ? "mdi-flag-variant"
                          : "mdi-arrow-right"
                      }}
                    </v-icon>
                  </template>
                  <span class="font-weight-medium">{{ step }}</span>
                </v-list-item>
              </v-list>

              <v-card
                border="start"
                class="pa-4 mt-6 rounded-lg"
                color="yellow-lighten-5"
              >
                <div class="font-weight-medium">
                  <v-icon class="mr-2" color="yellow-darken-2"
                    >mdi-map-marker</v-icon
                  >
                  Destination:
                  <strong class="text-yellow-darken-4">{{
                    suggestion.suggestion.alternativeDestination
                  }}</strong>
                </div>
                <div class="font-weight-medium mt-2">
                  <v-icon class="mr-2" color="yellow-darken-2"
                    >mdi-clock-outline</v-icon
                  >
                  Estimated Travel Time:
                  <strong class="text-yellow-darken-4"
                    >{{ suggestion.suggestion.totalTime }} minutes</strong
                  >
                </div>
                <div class="font-weight-medium mt-2">
                  <v-icon class="mr-2" color="yellow-darken-2">mdi-cash</v-icon>
                  Estimated Cost:
                  <strong class="text-yellow-darken-4"
                    >{{ suggestion.suggestion.totalCost }} Riel</strong
                  >
                </div>
              </v-card>
            </div>
          </v-expand-transition>

          <v-alert
            v-if="error && !error.suggestion"
            type="error"
            variant="tonal"
            class="mt-6 rounded-lg"
          >
            {{ error.message }}
          </v-alert>
        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref } from "vue";
import axios from "axios";

const from = ref("");
const to = ref("");
const result = ref(null);
const error = ref("");
const loading = ref(false);
const suggestion = ref(null);
const stops = ref([
  "Central Market",
  "Wat Phnom",
  "Riverside",
  "Olympic Stadium",
  "Mao Tse Toung Blvd",
  "Independence Monument",
  "Phsar Depo",
  "Orussey Market",
  "Chbar Ampov",
  "Kbal Thnal",
  "Russian Hospital",
  "Russian Market",
  "Toul Tom Poung Market",
  "Tuol Sleng Genocide Museum",
  "Cambodia Railway Station",
  "City Mall",
  "Koh Pich",
  "NagaWorld",
  "Sisowath High School",
  "Sangkat Boeung Keng Kang",
  "Psa Kambol",
  "Phnom Penh International Airport",
  "Sovanna Mall",
  "Wat Botum",
]);

const planRoute = async () => {
  if (!from.value || !to.value) return;
  suggestion.value = null;
  result.value = null;
  error.value = null; // Changed to null to allow for an object
  loading.value = true;
  try {
    const res = await axios.post("http://localhost:3000/api/navigation", {
      from: from.value,
      to: to.value,
    });
    if (res.data.suggestion) {
      suggestion.value = res.data;
    } else {
      result.value = res.data;
    }
  } catch (err) {
    // Check if the response data contains a suggestion
    error.value =
      err.response?.data?.message || "Error finding route. Please try again.";
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
/* No additional styles needed, as Vuetify handles the styling. */
</style>
