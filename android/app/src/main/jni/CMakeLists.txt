cmake_minimum_required(VERSION 3.22.1)

project(appmodules LANGUAGES CXX)

include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)

set(HSP_HINT_CORE_ROOT ${CMAKE_CURRENT_LIST_DIR}/../../../../../native/hsp-hint-core)
set(BUILD_TESTING OFF CACHE BOOL "" FORCE)
add_subdirectory(${HSP_HINT_CORE_ROOT} hsp_hint_core_build)

target_compile_features(appmodules PRIVATE cxx_std_20)
target_link_libraries(appmodules hsp_hint_core android log)
