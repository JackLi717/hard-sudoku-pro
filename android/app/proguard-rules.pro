# JNI exports in hint_engine_jni.cpp resolve this class and its native methods by
# name. Keep that boundary stable while R8 optimizes the surrounding app code.
-keepnames class com.platongames.sudoku.HintEngineModule
-keepclassmembers class com.platongames.sudoku.HintEngineModule {
    native <methods>;
}

# AdMob's WorkManager 2.7 / Room 2.2.5 dependency creates this database through
# reflection. Its legacy consumer rule keeps the class but not its constructor.
-keepclassmembers class androidx.work.impl.WorkDatabase_Impl {
    public <init>();
}
