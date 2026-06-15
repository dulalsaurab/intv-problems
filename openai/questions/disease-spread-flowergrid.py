
from collections import deque
from typing import List

class DiseaseSpread:

    def spreadModel(self, grid: List[List[int]], k: int) -> int:
        rotten_queue = deque()
        healthy_count = 0
        infected_n_count = {} # cell ---> 2, or 3 ///. 

        # find infected flower for multi step BFS
        for row in range(len(grid)):
            for col in range (len(grid[0])):
                if grid[row][col] == 2:
                    rotten_queue.append((row, col))
                elif grid[row][col] == 1:
                    healthy_count += 1
        
        # if nothing is infected, we dont need do anyting
        if not rotten_queue:
            return -1

        # check if the row, col is within the boundary
        def inboundary(row, col):
            return (
                0<= row < (len(grid)) and 
                0<= col < len(grid[0])
                )
        
        level = 0

        while rotten_queue:
            infected_something = False
            for _ in range(len(rotten_queue)):
                row, col = rotten_queue.popleft()

                # all eight direction from current coordinate
                next_coord = [(- 1, 0),(1, 0),
                              (0, - 1),(0, 1),
                              (1, 1),(- 1, -1),
                              (- 1, 1),(1, -1)]

                for dr, dc in next_coord:
                    nrow, ncol = row + dr, col + dc
                    if inboundary(nrow, ncol):
                        if grid[nrow][ncol] == 1:
                            infected_n_count[(nrow, ncol)] = infected_n_count.get((nrow, ncol), 0) + 1
                            if infected_n_count[(nrow, ncol)] == k:
                                grid[nrow][ncol] = 2
                                healthy_count -= 1
                                rotten_queue.append((nrow, ncol))
                                infected_something = True
                
            if infected_something:
                level += 1
            else:
                break
            
        # returning minutes
        return level if healthy_count == 0 else -1
    
        # # stage 2 unreachable flowers
        # return healthy_count
        # # stage 3
        # preventing contamination; we need to do min-cut / max-flow here

        



            
        