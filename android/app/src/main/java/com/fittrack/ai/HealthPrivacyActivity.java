package com.fittrack.ai;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Button;

public class HealthPrivacyActivity extends Activity {
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(Color.rgb(17, 21, 18));
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        int padding = (int) (24 * getResources().getDisplayMetrics().density);
        content.setPadding(padding, padding * 2, padding, padding);
        TextView policy = new TextView(this);
        policy.setTextColor(Color.WHITE);
        policy.setTextSize(18);
        policy.setText("FitTrack AI · Health Connect\n\nWe request read-only access to your step count. We never write or delete records in Health Connect.\n\nWhen you connect, daily step totals are copied to your signed-in FitTrack account on the server you selected. Totals replace manual step entries for each synced day. Distance, active minutes and calories are not inferred from steps.\n\nSync runs while the app is open and when you return to the Home screen. We do not request background health access.\n\nHealth Connect combines supported data sources. If your phone does not track steps through Health Connect itself, connect a compatible fitness app or watch.\n\nYour step totals are used for your activity dashboard and, only when you ask, the local fitness assistant running on your own server computer. We do not send health data to a paid AI service or use it for advertising.\n\nDisconnect in FitTrack to stop syncing. To revoke access, use Android Settings > Health Connect > App permissions > FitTrack AI. Disconnecting does not delete already saved FitTrack records. Delete your FitTrack account to remove its stored records, or export them from Profile.\n\nProtect access to the server hosting your FitTrack account. Use HTTPS when connecting outside a trusted development network.\n");
        content.addView(policy);
        Button close = new Button(this);
        close.setText("Done");
        close.setOnClickListener(v -> finish());
        content.addView(close);
        scroll.addView(content);
        setContentView(scroll);
    }
}
