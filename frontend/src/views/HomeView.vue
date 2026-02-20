<template>
  <v-app>
    <v-container class="fill-height" fluid>
      <v-col class="text-center">
        <v-row justify="center" align="center">
          <v-card class="pa-8 text-center" elevation="4" rounded="lg">
            <h1 class="text-h2 text-success">
              &#9745;&#65039; CheckIT
            </h1>
            <v-btn 
              to="/list"
              color="primary" 
              class="mt-6" 
              size="large"
            >
              einkaufsliste erstellen
            </v-btn>
          </v-card>
        </v-row>
      </v-col>
    </v-container>
  </v-app>
</template>
