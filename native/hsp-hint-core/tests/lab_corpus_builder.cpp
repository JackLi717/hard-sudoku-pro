// Share the bridge serializer with the legacy structural acceptance exporter.
#define main legacyFixtureExportMain
#include "fixture_export.cpp"
#undef main
#include "lab_fixture_validation.hpp"
#include "lab_fixture_coverage.hpp"
#include <cstdio>

namespace lab = hsp::hint_core::tests::lab;
namespace {
struct CorpusExample {
  Fixture fixture;
  std::vector<HintStep> history;
  std::vector<Technique> lower;
};
void writeCorpusExample(std::ostream &output, const CorpusExample &example) {
  const auto &fixture = example.fixture;
  const auto coverage = lab::classifyCoverage(fixture.request, fixture.step);
  std::ostringstream serialized;
  writeFixture(serialized, fixture,
               kTechniqueCatalog[static_cast<std::size_t>(fixture.step.technique)]);
  const auto text = serialized.str();
  output << text.substr(0, text.size() - 1);
  output << ",\"coverage\":{\"mode\":"
         << jsonString(coverage.mode)
         << ",\"layouts\":[";
  bool comma = false;
  for (const auto &layout : coverage.layouts) {
    if (comma) output << ',';
    output << jsonString(layout); comma = true;
  }
  output << "],\"result\":" << jsonString(coverage.result)
         << ",\"targetCount\":" << coverage.targetCount
         << "},\"validation\":{\"lowerFrontier\":\"stalled\",\"uniqueSolution\":true,\"replayVerified\":true,\"lowerTechniqueCodes\":[";
  comma = false;
  for (const auto lower : example.lower) {
    if (comma) output << ',';
    output << jsonString(std::string(techniqueCode(lower))); comma = true;
  }
  output << "]},\"replaySteps\":[";
  comma = false;
  for (const auto &step : example.history) {
    if (comma) output << ',';
    output << "{\"techniqueCode\":" << jsonString(std::string(techniqueCode(step.technique)));
    const auto writeEffects = [&](std::string_view key, const std::vector<Candidate> &items) {
      output << ",\"" << key << "\":[";
      bool separator = false;
      for (const auto candidate : items) {
        if (separator) output << ',';
        output << "{\"cell\":" << static_cast<unsigned>(candidate.cell)
               << ",\"digit\":" << static_cast<unsigned>(candidate.digit) << '}';
        separator = true;
      }
      output << ']';
    };
    writeEffects("placements", step.placements);
    writeEffects("eliminations", step.eliminations);
    output << '}'; comma = true;
  }
  output << "]}";
}
}
int main(int argc, char **argv) {
  if (argc == 4 && std::string(argv[1]) == "--regression") return legacyFixtureExportMain(argc - 1, argv + 1);
  if (argc < 3 || argc > 6) {
    std::cerr << "usage: lab_corpus_builder puzzles.csv output.json [puzzle-limit] [per-technique-limit] [technique-codes]\n";
    return EXIT_FAILURE;
  }
  const auto puzzleLimit = argc > 3 ? std::stoul(argv[3]) : 100000UL;
  const auto targetCount = argc > 4 ? std::stoul(argv[4]) : 12UL;
  std::set<std::string> requested;
  std::uint8_t maximumLevel = 5;
  if (argc > 5 && std::string(argv[5]).size() > 0) {
    for (const auto &code : split(argv[5])) requested.insert(code);
    maximumLevel = 1;
    for (const auto &descriptor : kTechniqueCatalog) if (requested.contains(std::string(descriptor.code))) maximumLevel = std::max(maximumLevel, descriptor.level);
  }
  std::ifstream input(argv[1]);
  if (!input) return EXIT_FAILURE;
  std::array<std::vector<CorpusExample>, kTechniqueCatalog.size()> examples;
  std::array<std::set<std::string>, kTechniqueCatalog.size()> sources;
  std::array<unsigned, kTechniqueCatalog.size()> incomplete{};
  std::array<std::map<std::string, unsigned>, kTechniqueCatalog.size()> modes;
  std::set<std::string> puzzles;
  std::string line;
  std::getline(input, line);
  std::size_t count = 0;
  const auto writeOutput = [&]() {
    const std::string temporaryPath = std::string(argv[2]) + ".partial";
    std::ofstream output(temporaryPath);
    const auto covered = std::count_if(examples.begin(), examples.end(), [](const auto &items) { return !items.empty(); });
    output << "{\"fixtureContentVersion\":1,\"fixtureCount\":" << covered << ",\"fixtures\":[";
    bool comma = false;
    for (const auto &items : examples) {
      if (items.empty()) continue;
      if (comma) output << ',';
      writeCorpusExample(output, items.front()); comma = true;
    }
    output << "],\"variants\":["; comma = false;
    for (const auto &items : examples) for (std::size_t index = 1; index < items.size(); ++index) {
      if (comma) output << ',';
      writeCorpusExample(output, items[index]); comma = true;
    }
    output << "],\"corpusValidation\":{\"scannedPuzzles\":" << count << ",\"techniques\":["; comma = false;
    for (const auto &descriptor : kTechniqueCatalog) {
      const auto index = static_cast<std::size_t>(descriptor.technique);
      if (comma) output << ',';
      output << "{\"techniqueCode\":" << jsonString(std::string(descriptor.code)) << ",\"count\":" << examples[index].size() << ",\"incomplete\":" << incomplete[index] << '}'; comma = true;

    }
    output << "]}}\n";
    output.close();
    if (std::rename(temporaryPath.c_str(), argv[2]) != 0) throw std::runtime_error("cannot install corpus checkpoint");
  };
  while (count < puzzleLimit && std::getline(input, line)) {
    if (!line.empty() && line.back() == '\r') line.pop_back();
    const auto fields = split(line);
    if (fields.size() < 3) return EXIT_FAILURE;
    if (!puzzles.insert(fields[1]).second) continue;
    ++count;
    const auto puzzle = parseBoard(fields[1]);
    const auto solution = parseBoard(fields[2]);
    HintRequest request{puzzle, createCandidates(puzzle)};
    for (Cell cell = 0; cell < kCellCount; ++cell) request.givenCells[cell] = puzzle[cell] != 0;
    std::vector<HintStep> history;
    for (int iteration = 0; iteration < 500; ++iteration) {
      std::optional<HintStep> advance;
      for (const auto &descriptor : kTechniqueCatalog) {
        const auto index = static_cast<std::size_t>(descriptor.technique);
        if (descriptor.level > maximumLevel) break;
        // Any step from an earlier difficulty proves later levels are not stalled.
        if (advance && difficultyLevel(advance->technique) < descriptor.level) break;
        const auto direct = detail::detectTechnique(request, descriptor.technique);
        if (!direct) continue;
        if (!advance) advance = direct;
        if (!requested.empty() && !requested.contains(std::string(descriptor.code))) continue;
        if (examples[index].size() >= targetCount || sources[index].contains(fields[1])) continue;
        const auto frontier = lab::inspectLowerFrontier(request, descriptor.technique);
        if (frontier.status == lab::FrontierStatus::incomplete) { ++incomplete[index]; continue; }
        if (frontier.status != lab::FrontierStatus::stalled) continue;
        const auto candidates = detail::detectTechniqueTeachingCandidates(request, descriptor.technique);
        std::optional<HintStep> selected;
        std::string modeKey;
        for (auto candidate : candidates.steps) {
          detail::addTeachingProof(request, candidate);
          const auto candidateKey = lab::coverageKey(lab::classifyCoverage(request, candidate));
          if (examples[index].size() >= 3 && modes[index][candidateKey] >= 2) continue;
          if (!selected || modes[index][candidateKey] < modes[index][modeKey]) {
            selected = std::move(candidate);
            modeKey = candidateKey;
          }
        }
        if (!selected) continue;
        auto step = std::move(*selected);
        auto after = request;
        if (!applyStep(after, step, solution)) continue;
        const auto errors = lab::validateSource(puzzle, solution, request, history);
        if (!errors.empty()) {
          std::cerr << "rejected " << descriptor.code << ' ' << fields[0] << ": " << errors.front() << '\n';
          continue;
        }
        const auto id = "hint-lab-" + std::string(descriptor.code) + "-" + fields[0] + "-" + std::to_string(iteration);
        examples[index].push_back({Fixture{request, step, puzzle, solution, fields[0], iteration, false, id}, history, frontier.checked});
        sources[index].insert(fields[1]);
        ++modes[index][modeKey];
        std::cerr << "found " << descriptor.code << ' ' << examples[index].size() << " puzzle " << count << " " << modeKey << '\n';
      }
      if (!advance || !applyStep(request, *advance, solution)) break;
      history.push_back(*advance);
    }
    if (count % 100 == 0) { writeOutput(); std::cerr << "scanned " << count << '\n'; }
  }
  writeOutput();
  return EXIT_SUCCESS;
}
