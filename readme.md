# Frosted Glass, a visualization tool for ESP32s

[https://github.com/user-attachments/assets/16b3f578-fc46-4af7-a5bc-4d595099d930](https://github.com/user-attachments/assets/16b3f578-fc46-4af7-a5bc-4d595099d930)

Michael said that microcontrollers are like black boxes, so this is an attempt to give us a better glimpse of what is going on inside them. This doesn't tell the full story, but still gives us better ideas of what is going on, kind of like a frosted glass box, which is still a one up on a black box.

### Details

- To be used with the instrumentation library found <a href="https://github.com/SleepyWoodpecker/Frosted-Glass-Instrumentation/tree/main/lib/Tracer">here</a>
- Currently only logging traces via UART, which only supports single threaded `loop()` running at 100Hz (there are plans to make this WiFi compatible though)
