#include <ESP8266WiFi.h>
#include <HX711.h>

// WiFi credentials
const char* ssid = "hahaha"; 
const char* password = "111111111"; 

// HX711 setup
HX711 scale;
const int DOUT = D2; // Data output pin
const int CLK = D1;  // Clock pin



const String room = "room1";
const String bed = "bed1";

// Buzzer setup
const int buzzerPin = D5;  // Pin connected to the buzzer

// LED setup
const int redLedPin = D6;       // Pin connected to the red LED
const int constantLedPin = D7;  // Pin connected to the constant LED

// Server details
const char* server = "192.168.120.91";  
const int serverPort = 5000;

// Calibration factor
float calibration_factor = 300.0; 

// Timing variables
unsigned long lastTime = 0;   
unsigned long interval = 500; 

// Variables for controlling states
bool alertActive = false;  

void setup() {
    Serial.begin(115200);
    scale.begin(DOUT, CLK);
    scale.set_scale(calibration_factor); // Set the calibration factor for the load cell

    // Tare the scale
    Serial.println("Taring scale... Ensure no weight is applied.");
    scale.tare(); // Resets the scale to 0
    delay(2000);
    Serial.println("Tare complete. Scale is ready!");

    // Set up buzzer and LED pins as output
    pinMode(buzzerPin, OUTPUT);
    digitalWrite(buzzerPin, LOW); // Ensure buzzer is off initially

    pinMode(redLedPin, OUTPUT);
    digitalWrite(redLedPin, LOW); // Ensure red LED is off initially

    pinMode(constantLedPin, OUTPUT);
    digitalWrite(constantLedPin, HIGH); // Ensure constant LED is on initially

    // Connect to WiFi
    WiFi.begin(ssid, password);
    Serial.print("Connecting to WiFi");
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }

    Serial.println("\nConnected to WiFi");
    Serial.print("NodeMCU IP address: ");
    Serial.println(WiFi.localIP());
}

void loop() {
    unsigned long currentMillis = millis();

    if (currentMillis - lastTime >= interval) {
        lastTime = currentMillis; 

        float weight = scale.get_units(5); // Average of 5 readings

        if (weight < 0) {
            Serial.println("Invalid weight reading. Check the load cell.");
            return;
        }

        if (weight > 1100) {  // Enforce 1100g weight limit
            Serial.println("Weight exceeds the 1100g limit. Action ignored.");
            return;
        }

        Serial.print("Weight reading: ");
        Serial.println(weight);

        if (weight < 80) {
            if (!alertActive) {
                tone(buzzerPin, 2000);  // Turn on buzzer (2kHz tone)
                digitalWrite(redLedPin, HIGH); // Turn on red LED
                digitalWrite(constantLedPin, LOW); // Turn off constant LED
                alertActive = true; 
                Serial.println("Weight below 80g! Buzzer and red LED activated, constant LED turned off.");
            }
        } else {
            noTone(buzzerPin); 
            digitalWrite(redLedPin, LOW); // Turn off red LED
            digitalWrite(constantLedPin, HIGH); // Turn on constant LED
            alertActive = false;  
        }

        WiFiClient client;
        if (!client.connect(server, serverPort)) {
            Serial.println("Connection to server failed");
            return;
        }

        // Assign room1 and bed1
        String room = "room1";
        String bed = "bed1";

        // Build URL with room, bed, and weight parameters
        String url = "/update?room=" + room + "&bed=" + bed + "&weight=" + String(weight, 2);
        client.print(String("GET ") + url + " HTTP/1.1\r\n" +
                     "Host: " + server + "\r\n" +
                     "Connection: close\r\n\r\n");

        Serial.print("Sent weight: ");
        Serial.println(weight, 2); 

        client.stop();
    }
}
