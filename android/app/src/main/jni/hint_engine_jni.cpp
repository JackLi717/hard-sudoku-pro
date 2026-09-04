#include "hsp/hint_core/bridge.hpp"

#include <jni.h>

#include <atomic>
#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>

namespace {

class JniString final {
public:
  JniString(JNIEnv *environment, jstring value)
      : environment_(environment), value_(value),
        characters_(value == nullptr
                        ? nullptr
                        : environment->GetStringUTFChars(value, nullptr)) {}

  ~JniString() {
    if (characters_ != nullptr) {
      environment_->ReleaseStringUTFChars(value_, characters_);
    }
  }

  JniString(const JniString &) = delete;
  JniString &operator=(const JniString &) = delete;

  [[nodiscard]] std::string str() const {
    return characters_ == nullptr ? std::string{} : std::string{characters_};
  }

private:
  JNIEnv *environment_;
  jstring value_;
  const char *characters_;
};

std::mutex requestsMutex;
std::unordered_map<std::string, std::shared_ptr<std::atomic_bool>> requests;

} // namespace

extern "C" JNIEXPORT void JNICALL
Java_com_jackli717_sudoku_HintEngineModule_nativePrepare(
    JNIEnv *environment, jobject, jstring requestIdValue) {
  const std::string requestId = JniString(environment, requestIdValue).str();
  const std::lock_guard lock(requestsMutex);
  requests.insert_or_assign(requestId,
                            std::make_shared<std::atomic_bool>(false));
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_jackli717_sudoku_HintEngineModule_nativeNextStep(
    JNIEnv *environment, jobject, jstring requestIdValue,
    jstring boardFingerprintValue, jstring candidateMasksValue,
    jstring givenCellsValue) {
  const std::string requestId = JniString(environment, requestIdValue).str();
  const std::string boardFingerprint =
      JniString(environment, boardFingerprintValue).str();
  const std::string candidateMasks =
      JniString(environment, candidateMasksValue).str();
  const std::string givenCells = JniString(environment, givenCellsValue).str();
  std::shared_ptr<std::atomic_bool> cancelled;
  {
    const std::lock_guard lock(requestsMutex);
    auto [request, inserted] = requests.try_emplace(
        requestId, std::make_shared<std::atomic_bool>(false));
    (void)inserted;
    cancelled = request->second;
  }

  const std::string result = hsp::hint_core::nextStepJson(
      boardFingerprint, candidateMasks, givenCells, cancelled.get());
  {
    const std::lock_guard lock(requestsMutex);
    const auto current = requests.find(requestId);
    if (current != requests.end() && current->second == cancelled) {
      requests.erase(current);
    }
  }
  return environment->NewStringUTF(result.c_str());
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_jackli717_sudoku_HintEngineModule_nativeEnumerateSteps(
    JNIEnv *environment, jobject, jstring requestIdValue,
    jstring boardFingerprintValue, jstring candidateMasksValue,
    jstring givenCellsValue) {
  const std::string requestId = JniString(environment, requestIdValue).str();
  const std::string boardFingerprint =
      JniString(environment, boardFingerprintValue).str();
  const std::string candidateMasks =
      JniString(environment, candidateMasksValue).str();
  const std::string givenCells = JniString(environment, givenCellsValue).str();
  std::shared_ptr<std::atomic_bool> cancelled;
  {
    const std::lock_guard lock(requestsMutex);
    auto [request, inserted] = requests.try_emplace(
        requestId, std::make_shared<std::atomic_bool>(false));
    (void)inserted;
    cancelled = request->second;
  }

  const std::string result = hsp::hint_core::enumerateStepsJson(
      boardFingerprint, candidateMasks, givenCells, cancelled.get());
  {
    const std::lock_guard lock(requestsMutex);
    const auto current = requests.find(requestId);
    if (current != requests.end() && current->second == cancelled) {
      requests.erase(current);
    }
  }
  return environment->NewStringUTF(result.c_str());
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_jackli717_sudoku_HintEngineModule_nativeExplainOpportunityEffects(
    JNIEnv *environment, jobject, jstring requestIdValue,
    jstring boardFingerprintValue, jstring candidateMasksValue,
    jstring givenCellsValue, jstring observedEffectsValue) {
  const std::string requestId = JniString(environment, requestIdValue).str();
  const std::string boardFingerprint =
      JniString(environment, boardFingerprintValue).str();
  const std::string candidateMasks =
      JniString(environment, candidateMasksValue).str();
  const std::string givenCells = JniString(environment, givenCellsValue).str();
  const std::string observedEffects =
      JniString(environment, observedEffectsValue).str();
  std::shared_ptr<std::atomic_bool> cancelled;
  {
    const std::lock_guard lock(requestsMutex);
    auto [request, inserted] = requests.try_emplace(
        requestId, std::make_shared<std::atomic_bool>(false));
    (void)inserted;
    cancelled = request->second;
  }
  const std::string result = hsp::hint_core::opportunityExplanationJson(
      boardFingerprint, candidateMasks, givenCells, observedEffects,
      cancelled.get());
  {
    const std::lock_guard lock(requestsMutex);
    const auto current = requests.find(requestId);
    if (current != requests.end() && current->second == cancelled) {
      requests.erase(current);
    }
  }
  return environment->NewStringUTF(result.c_str());
}

extern "C" JNIEXPORT void JNICALL
Java_com_jackli717_sudoku_HintEngineModule_nativeCancel(
    JNIEnv *environment, jobject, jstring requestIdValue) {
  const std::string requestId = JniString(environment, requestIdValue).str();
  const std::lock_guard lock(requestsMutex);
  const auto request = requests.find(requestId);
  if (request != requests.end()) {
    request->second->store(true, std::memory_order_relaxed);
  }
}

extern "C" JNIEXPORT void JNICALL
Java_com_jackli717_sudoku_HintEngineModule_nativeCancelAll(JNIEnv *, jobject) {
  const std::lock_guard lock(requestsMutex);
  for (const auto &[requestId, cancelled] : requests) {
    (void)requestId;
    cancelled->store(true, std::memory_order_relaxed);
  }
  requests.clear();
}
