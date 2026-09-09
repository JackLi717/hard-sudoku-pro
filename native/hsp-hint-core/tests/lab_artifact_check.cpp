#include "lab_fixture_coverage.hpp"
#include "hsp/hint_core/bridge.hpp"
#include <iostream>
#include <sstream>
using namespace hsp::hint_core;
namespace lab = hsp::hint_core::tests::lab;
Board board(const std::string &text) {
  if (text.size()!=81) throw std::runtime_error("invalid board");
  Board result{};
  for (Cell c=0;c<81;++c) { if(text[c]<'0'||text[c]>'9')throw std::runtime_error("invalid board digit"); result[c]=static_cast<Digit>(text[c]-'0'); }
  return result;
}
Technique technique(const std::string &code) {
  for (const auto &entry:kTechniqueCatalog) if(entry.code==code)return entry.technique;
  throw std::runtime_error("unknown technique");
}
std::vector<Candidate> candidates(std::string text) {
  std::vector<Candidate> result;
  if(text=="-")return result;
  std::replace(text.begin(),text.end(),',',' ');
  std::replace(text.begin(),text.end(),':',' ');
  std::istringstream input(text); unsigned cell,digit;
  while(input>>cell) {
    if(!(input>>digit)||cell>=81||digit<1||digit>9)throw std::runtime_error("invalid candidate");
    result.push_back({static_cast<Cell>(cell),static_cast<Digit>(digit)});
  }
  if(!input.eof())throw std::runtime_error("malformed candidate");
  return result;
}
HintStep readStep() {
  std::string code,placements,eliminations;
  if(!(std::cin>>code>>placements>>eliminations))throw std::runtime_error("missing step");
  HintStep step{};step.technique=technique(code);
  step.placements=candidates(placements);step.eliminations=candidates(eliminations);
  return step;
}
int run(int argc, char **argv) {
  if(argc==2 && std::string(argv[1])=="--catalog") {
    std::cout<<'[';
    for(std::size_t i=0;i<kTechniqueCatalog.size();++i) {
      if(i)std::cout<<',';
      const auto &entry=kTechniqueCatalog[i];
      std::cout<<"{\"techniqueCode\":\""<<entry.code<<"\",\"difficultyLevel\":"<<static_cast<unsigned>(entry.level)<<'}';
    }
    std::cout<<"]\n";return 0;
  }
  if(argc!=1)throw std::runtime_error("unexpected arguments");
  std::string id,puzzleText,solutionText,boardText,givens;
  while(std::cin>>id) {
    if(!(std::cin>>puzzleText>>solutionText>>boardText>>givens))throw std::runtime_error("incomplete fixture");
    auto puzzle=board(puzzleText),solution=board(solutionText);
    HintRequest request{};request.board=board(boardText);
    if(givens.size()!=81 || givens.find_first_not_of("01")!=std::string::npos)throw std::runtime_error("invalid givens");
    for(Cell c=0;c<81;++c){unsigned mask;if(!(std::cin>>mask)||mask>511)throw std::runtime_error("invalid candidate mask");request.hintCandidates[c]=static_cast<CandidateMask>(mask);request.givenCells[c]=givens[c]=='1';}
    std::size_t length;if(!(std::cin>>length)||length>729)throw std::runtime_error("invalid history length");std::vector<HintStep> history;
    for(std::size_t i=0;i<length;++i)history.push_back(readStep());
    const auto target=readStep();
    auto errors=lab::validateSource(puzzle,solution,request,history);
    const auto targetErrors=lab::validateTarget(request,target,solution);
    errors.insert(errors.end(),targetErrors.begin(),targetErrors.end());
    const auto frontier=lab::inspectLowerFrontier(request,target.technique);
    if(frontier.status!=lab::FrontierStatus::stalled)errors.push_back(frontier.status==lab::FrontierStatus::available?"lower_move_available":"lower_check_incomplete");
    std::cout<<"{\"id\":\""<<id<<"\",\"errors\":[";
    for(std::size_t i=0;i<errors.size();++i){if(i)std::cout<<',';std::cout<<'"'<<errors[i]<<'"';}
    std::cout<<"],\"witnesses\":[";
    const auto result=detail::detectTechniqueTeachingCandidates(request,target.technique);
    bool comma=false;
    for(auto candidate:result.steps) {
      if(candidate.placements!=target.placements || candidate.eliminations!=target.eliminations)continue;
      detail::addTeachingProof(request,candidate);
      const auto coverage=lab::classifyCoverage(request,candidate);
      if(comma)std::cout<<',';comma=true;
      std::cout<<"{\"mode\":\""<<coverage.mode<<"\",\"layouts\":[";
      for(std::size_t i=0;i<coverage.layouts.size();++i){if(i)std::cout<<',';std::cout<<'"'<<coverage.layouts[i]<<'"';}
      std::cout<<"],\"result\":\""<<coverage.result<<"\",\"targetCount\":"<<coverage.targetCount<<",\"engineResult\":"<<serializeHintStepJson(boardText,candidate)<<'}';
    }
    std::cout<<"],\"enumerationIncomplete\":"<<(result.reachedEnumerationLimit ? "true" : "false")<<'}'<<std::endl;
  }
  if(!std::cin.eof())throw std::runtime_error("malformed fixture");
  return 0;
}
int main(int argc,char **argv) {
  try { return run(argc,argv); } catch(const std::exception &error) { std::cerr<<error.what()<<'\n';return 2; }
}
