package it.pydaily.app;
import android.app.*;
import android.content.*;
import java.util.Calendar;

public class ReminderReceiver extends BroadcastReceiver {
    static void schedule(Context context){
        android.content.SharedPreferences prefs=context.getSharedPreferences("native",0);
        AlarmManager alarm=(AlarmManager)context.getSystemService(Context.ALARM_SERVICE);
        PendingIntent pending=PendingIntent.getBroadcast(context,7,new Intent(context,ReminderReceiver.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        alarm.cancel(pending);if(!prefs.getBoolean("reminder",false))return;
        String[] parts=prefs.getString("reminderTime","19:30").split(":");
        Calendar next=Calendar.getInstance();next.set(Calendar.HOUR_OF_DAY,Integer.parseInt(parts[0]));next.set(Calendar.MINUTE,Integer.parseInt(parts[1]));next.set(Calendar.SECOND,0);next.set(Calendar.MILLISECOND,0);if(next.getTimeInMillis()<=System.currentTimeMillis())next.add(Calendar.DATE,1);
        alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,next.getTimeInMillis(),pending);
    }
    @Override public void onReceive(Context context,Intent intent){
        if(Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())||Intent.ACTION_TIMEZONE_CHANGED.equals(intent.getAction())||Intent.ACTION_TIME_CHANGED.equals(intent.getAction())){schedule(context);return;}
        if(!context.getSharedPreferences("native",0).getBoolean("reminder",false))return;
        NotificationManager manager=(NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE);
        manager.createNotificationChannel(new NotificationChannel("practice","Sfida giornaliera",NotificationManager.IMPORTANCE_DEFAULT));
        PendingIntent open=PendingIntent.getActivity(context,0,new Intent(context,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification notification=new Notification.Builder(context,"practice").setSmallIcon(it.pydaily.app.R.drawable.notification_icon).setContentTitle("Il tuo momento Python").setContentText("Un piccolo problema, un passo avanti. La sfida ti aspetta.").setContentIntent(open).setAutoCancel(true).build();
        try{manager.notify(7,notification);}catch(SecurityException ignored){}
        schedule(context);
    }
}
