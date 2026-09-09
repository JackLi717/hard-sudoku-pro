#import <ReactCodegen/HardSudokuProSpec/HardSudokuProSpec.h>

#include "hsp/hint_core/bridge.hpp"

#include <atomic>
#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>

using namespace facebook::react;

@interface HintEngineModule : NativeHintEngineSpecBase <NativeHintEngineSpec>
@end

@implementation HintEngineModule {
  dispatch_queue_t _workerQueue;
  std::mutex _requestsMutex;
  std::unordered_map<std::string, std::shared_ptr<std::atomic_bool>> _requests;
}

RCT_EXPORT_MODULE(HintEngine)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (instancetype)init
{
  self = [super init];
  if (self) {
    _workerQueue = dispatch_queue_create("com.jackli717.sudoku.hint-engine", DISPATCH_QUEUE_SERIAL);
  }
  return self;
}

RCT_EXPORT_METHOD(nextStep
                  : (NSString *)requestId boardFingerprint
                  : (NSString *)boardFingerprint candidateMasks
                  : (NSString *)candidateMasks givenCells
                  : (NSString *)givenCells resolve
                  : (RCTPromiseResolveBlock)resolve reject
                  : (RCTPromiseRejectBlock)reject)
{
  const std::string identifier{requestId.UTF8String};
  auto cancelled = std::make_shared<std::atomic_bool>(false);
  {
    const std::lock_guard lock(_requestsMutex);
    _requests[identifier] = cancelled;
  }

  dispatch_async(_workerQueue, ^{
    try {
      const std::string result = hsp::hint_core::nextStepJson(
          boardFingerprint.UTF8String,
          candidateMasks.UTF8String,
          givenCells.UTF8String,
          cancelled.get());
      {
        const std::lock_guard lock(self->_requestsMutex);
        const auto current = self->_requests.find(identifier);
        if (current != self->_requests.end() && current->second == cancelled) {
          self->_requests.erase(current);
        }
      }
      resolve([NSString stringWithUTF8String:result.c_str()]);
    } catch (const std::exception &error) {
      {
        const std::lock_guard lock(self->_requestsMutex);
        const auto current = self->_requests.find(identifier);
        if (current != self->_requests.end() && current->second == cancelled) {
          self->_requests.erase(current);
        }
      }
      reject(@"E_HINT_ENGINE", [NSString stringWithUTF8String:error.what()], nil);
    } catch (...) {
      {
        const std::lock_guard lock(self->_requestsMutex);
        const auto current = self->_requests.find(identifier);
        if (current != self->_requests.end() && current->second == cancelled) {
          self->_requests.erase(current);
        }
      }
      reject(@"E_HINT_ENGINE", @"Unknown native hint engine error", nil);
    }
  });
}

RCT_EXPORT_METHOD(enumerateSteps
                  : (NSString *)requestId boardFingerprint
                  : (NSString *)boardFingerprint candidateMasks
                  : (NSString *)candidateMasks givenCells
                  : (NSString *)givenCells resolve
                  : (RCTPromiseResolveBlock)resolve reject
                  : (RCTPromiseRejectBlock)reject)
{
  const std::string identifier{requestId.UTF8String};
  auto cancelled = std::make_shared<std::atomic_bool>(false);
  {
    const std::lock_guard lock(_requestsMutex);
    _requests[identifier] = cancelled;
  }

  dispatch_async(_workerQueue, ^{
    try {
      const std::string result = hsp::hint_core::enumerateStepsJson(
          boardFingerprint.UTF8String,
          candidateMasks.UTF8String,
          givenCells.UTF8String,
          cancelled.get());
      {
        const std::lock_guard lock(self->_requestsMutex);
        const auto current = self->_requests.find(identifier);
        if (current != self->_requests.end() && current->second == cancelled) {
          self->_requests.erase(current);
        }
      }
      resolve([NSString stringWithUTF8String:result.c_str()]);
    } catch (const std::exception &error) {
      {
        const std::lock_guard lock(self->_requestsMutex);
        const auto current = self->_requests.find(identifier);
        if (current != self->_requests.end() && current->second == cancelled) {
          self->_requests.erase(current);
        }
      }
      reject(@"E_HINT_ENGINE", [NSString stringWithUTF8String:error.what()], nil);
    } catch (...) {
      {
        const std::lock_guard lock(self->_requestsMutex);
        const auto current = self->_requests.find(identifier);
        if (current != self->_requests.end() && current->second == cancelled) {
          self->_requests.erase(current);
        }
      }
      reject(@"E_HINT_ENGINE", @"Unknown native hint engine error", nil);
    }
  });
}

RCT_EXPORT_METHOD(explainOpportunityEffects
                  : (NSString *)requestId boardFingerprint
                  : (NSString *)boardFingerprint candidateMasks
                  : (NSString *)candidateMasks givenCells
                  : (NSString *)givenCells observedEffects
                  : (NSString *)observedEffects resolve
                  : (RCTPromiseResolveBlock)resolve reject
                  : (RCTPromiseRejectBlock)reject)
{
  const std::string identifier{requestId.UTF8String};
  auto cancelled = std::make_shared<std::atomic_bool>(false);
  {
    const std::lock_guard lock(_requestsMutex);
    _requests[identifier] = cancelled;
  }

  dispatch_async(_workerQueue, ^{
    try {
      const std::string result = hsp::hint_core::opportunityExplanationJson(
          boardFingerprint.UTF8String,
          candidateMasks.UTF8String,
          givenCells.UTF8String,
          observedEffects.UTF8String,
          cancelled.get());
      {
        const std::lock_guard lock(self->_requestsMutex);
        const auto current = self->_requests.find(identifier);
        if (current != self->_requests.end() && current->second == cancelled) {
          self->_requests.erase(current);
        }
      }
      resolve([NSString stringWithUTF8String:result.c_str()]);
    } catch (const std::exception &error) {
      reject(@"E_OPPORTUNITY_ANALYZER", [NSString stringWithUTF8String:error.what()], nil);
    } catch (...) {
      reject(@"E_OPPORTUNITY_ANALYZER", @"Unknown opportunity analyzer error", nil);
    }
  });
}

RCT_EXPORT_METHOD(cancel : (NSString *)requestId)
{
  const std::lock_guard lock(_requestsMutex);
  const auto request = _requests.find(requestId.UTF8String);
  if (request != _requests.end()) {
    request->second->store(true, std::memory_order_relaxed);
  }
}

- (void)invalidate
{
  const std::lock_guard lock(_requestsMutex);
  for (const auto &[requestId, cancelled] : _requests) {
    (void)requestId;
    cancelled->store(true, std::memory_order_relaxed);
  }
  _requests.clear();
}

- (std::shared_ptr<TurboModule>)getTurboModule:(const ObjCTurboModule::InitParams &)params
{
  return std::make_shared<NativeHintEngineSpecJSI>(params);
}

@end
