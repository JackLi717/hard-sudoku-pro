cmake_minimum_required(VERSION 3.22.1)

project(hsp_hint_core VERSION 0.1.0 LANGUAGES CXX)

add_library(hsp_hint_core STATIC
  src/engine.cpp
)

target_include_directories(hsp_hint_core
  PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

target_compile_features(hsp_hint_core PUBLIC cxx_std_20)
set_target_properties(hsp_hint_core PROPERTIES
  CXX_EXTENSIONS OFF
  POSITION_INDEPENDENT_CODE ON
)

if(MSVC)
  target_compile_options(hsp_hint_core PRIVATE /W4 /WX)
else()
  target_compile_options(hsp_hint_core PRIVATE -Wall -Wextra -Wpedantic -Werror)
endif()

include(CTest)
if(BUILD_TESTING)
  add_executable(hsp_hint_core_tests tests/engine_test.cpp)
  target_link_libraries(hsp_hint_core_tests PRIVATE hsp_hint_core)
  target_compile_features(hsp_hint_core_tests PRIVATE cxx_std_20)
  add_test(NAME hsp_hint_core_tests COMMAND hsp_hint_core_tests)
endif()
