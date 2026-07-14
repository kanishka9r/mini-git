CXX = g++
CXXFLAGS = -std=c++17 -pthread -I include -I libs
SRC_DIR = src
SOURCES = $(wildcard $(SRC_DIR)/*.cpp)

all: vcs

vcs: $(SOURCES)
	$(CXX) $(CXXFLAGS) $^ -o $@

clean:
	rm -f vcs
