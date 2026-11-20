package com.fittrack.ai;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(SecureSessionPlugin.class);
        registerPlugin(HealthConnectPlugin.class);
        registerPlugin(StepCounterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
