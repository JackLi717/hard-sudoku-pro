#import <ReactCodegen/HardSudokuProSpec/HardSudokuProSpec.h>

#import <CommonCrypto/CommonDigest.h>

using namespace facebook::react;

@interface ContentDatabaseModule : NativeContentDatabaseSpecBase <NativeContentDatabaseSpec>
@end

@implementation ContentDatabaseModule {
  dispatch_queue_t _workerQueue;
}

RCT_EXPORT_MODULE(ContentDatabase)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (instancetype)init
{
  self = [super init];
  if (self) {
    _workerQueue = dispatch_queue_create(
        "com.jackli717.sudoku.content-database", DISPATCH_QUEUE_SERIAL);
  }
  return self;
}

static NSString *HSPFileSHA256(NSURL *url, NSError **error)
{
  NSData *data = [NSData dataWithContentsOfURL:url
                                      options:NSDataReadingMappedIfSafe
                                        error:error];
  if (data == nil) {
    return nil;
  }
  unsigned char digest[CC_SHA256_DIGEST_LENGTH];
  CC_SHA256(data.bytes, (CC_LONG)data.length, digest);
  NSMutableString *result = [NSMutableString stringWithCapacity:CC_SHA256_DIGEST_LENGTH * 2];
  for (NSUInteger index = 0; index < CC_SHA256_DIGEST_LENGTH; index += 1) {
    [result appendFormat:@"%02x", digest[index]];
  }
  return result;
}

static BOOL HSPIsSafeFileName(NSString *name)
{
  if (name.length == 0 || [name containsString:@"/"] || [name containsString:@"\\"] ||
      [name containsString:@".."] ) {
    return NO;
  }
  return YES;
}

RCT_EXPORT_METHOD(installBundledContentDatabase
                  : (NSString *)assetName targetName
                  : (NSString *)targetName expectedSha256
                  : (NSString *)expectedSha256 resolve
                  : (RCTPromiseResolveBlock)resolve reject
                  : (RCTPromiseRejectBlock)reject)
{
  dispatch_async(_workerQueue, ^{
    @autoreleasepool {
      if (!HSPIsSafeFileName(assetName) || !HSPIsSafeFileName(targetName) ||
          expectedSha256.length != 64) {
        reject(@"E_CONTENT_INSTALL", @"Invalid content database descriptor", nil);
        return;
      }

      NSFileManager *files = NSFileManager.defaultManager;
      NSError *error = nil;
      NSURL *documents = [files URLForDirectory:NSDocumentDirectory
                                       inDomain:NSUserDomainMask
                              appropriateForURL:nil
                                         create:YES
                                          error:&error];
      NSURL *directory = [documents URLByAppendingPathComponent:@"databases" isDirectory:YES];
      if (documents == nil ||
          ![files createDirectoryAtURL:directory
           withIntermediateDirectories:YES
                            attributes:nil
                                 error:&error]) {
        reject(@"E_CONTENT_INSTALL", @"Could not create database directory", error);
        return;
      }

      NSURL *target = [directory URLByAppendingPathComponent:targetName];
      if ([files fileExistsAtPath:target.path]) {
        NSString *installedHash = HSPFileSHA256(target, &error);
        if ([installedHash caseInsensitiveCompare:expectedSha256] == NSOrderedSame) {
          resolve(@"databases");
          return;
        }
      }

      NSString *baseName = assetName.stringByDeletingPathExtension;
      NSString *extension = assetName.pathExtension;
      NSURL *source = [NSBundle.mainBundle URLForResource:baseName withExtension:extension];
      if (source == nil) {
        reject(@"E_CONTENT_INSTALL", @"Bundled content database is missing", nil);
        return;
      }

      NSURL *temporary = [directory URLByAppendingPathComponent:
          [targetName stringByAppendingString:@".installing"]];
      [files removeItemAtURL:temporary error:nil];
      if (![files copyItemAtURL:source toURL:temporary error:&error]) {
        reject(@"E_CONTENT_INSTALL", @"Could not stage content database", error);
        return;
      }
      NSString *stagedHash = HSPFileSHA256(temporary, &error);
      if ([stagedHash caseInsensitiveCompare:expectedSha256] != NSOrderedSame) {
        [files removeItemAtURL:temporary error:nil];
        reject(@"E_CONTENT_INSTALL", @"Bundled content database checksum mismatch", error);
        return;
      }
      [files removeItemAtURL:target error:nil];
      if (![files moveItemAtURL:temporary toURL:target error:&error]) {
        reject(@"E_CONTENT_INSTALL", @"Could not install content database", error);
        return;
      }
      resolve(@"databases");
    }
  });
}

- (std::shared_ptr<TurboModule>)getTurboModule:(const ObjCTurboModule::InitParams &)params
{
  return std::make_shared<NativeContentDatabaseSpecJSI>(params);
}

@end
